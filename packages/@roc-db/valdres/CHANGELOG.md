# @roc-db/valdres

## 0.2.0-pre.102

### Minor Changes

- [#27](https://github.com/eigilsagafos/roc-db/pull/27)
  [`a978cb7`](https://github.com/eigilsagafos/roc-db/commit/a978cb7e0b9af6f34da067f5b4fcd363f08e05f2)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Support valdres
  `1.0.0-beta.20+`. The peer range moves from the exact pin `0.2.0-pre.18` to
  `>=1.0.0-beta.20 <2.0.0`.

    valdres made its internal `store.data` and `txn.data` handles private in
    `1.0.0-beta.17`, and the adapter reached into both. Any changeSet flow threw
    `TypeError: Cannot read properties of undefined (reading 'versionRefLoaded')`
    on `1.0.0-beta.17` and later — which blocked upgrading to `1.0.0-beta.18`,
    the release that introduced `globalAtom()` / `globalAtomFamily()`.

    The two pieces of state the adapter kept on the scope's `data` object — the
    per-scope transaction cache and the "base snapshot already seeded" flag —
    are roc-db concepts, so they now live in an adapter-owned registry keyed by
    `(store, changeSetRef)` instead of on valdres internals. Alongside that:

    - The scope-existence check in `beginRequest` uses valdres' public
      `store.hasScope()` instead of probing `store.data.scopes`.
    - The registry entry is tied to the scope's lifetime with
      `store.onDispose()`, so a scope that is destroyed and later re-opened
      under the same changeSet ref starts from clean state rather than
      inheriting the dead scope's cache and seeded-base flag.
    - `onChangeSetApplied` cleans up the applied changeSet again. It had been
      silently optional-chaining into the removed `store.data`, so a scope's
      cache and seeded-base flag outlived the changeSet. It now drops the
      adapter's scope entry and reverts the valdres scope with `unsetAll()`,
      staged through the enclosing transaction so the revert lands in the same
      commit as the apply. A draft's scope no longer shadows the root once
      published — previously a UI still rendering that draft would sit at
      pre-apply state indefinitely.
    - `end()` no longer calls `rootTxn.commit()`. valdres removed manual commit
      from the public transaction surface; the `store.txn` that `begin()` opens
      commits itself when the callback returns.

    **Breaking:** valdres below `1.0.0-beta.20` is no longer supported —
    `ScopedStore` is not exported before `beta.18`, `unsetAll()` arrived in
    `beta.19`, and `store.hasScope()` / `store.onDispose()` in `beta.20`.
    Upgrade valdres alongside this release.

## 0.2.0-pre.101

### Patch Changes

- [#18](https://github.com/eigilsagafos/roc-db/pull/18)
  [`86f88c8`](https://github.com/eigilsagafos/roc-db/commit/86f88c8f1334129eb368c7336ddf91e5869aa850)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Fix: scope debounce
  matching by `changeSetRef` in the valdres, in-memory, and postgres adapters.

    `findDebounceMutation` matched a debounce candidate by operation name +
    `payload.ref` + `identityRef` + time window, but **not** by `changeSetRef`.
    As a result, a debounced edit made in a new changeSet could reuse a mutation
    from a _different_ changeSet, and `createMutation` would then inherit that
    mutation's stale `changeSetRef` via `{...res}`.

    The concrete failure: edit an entity's field in draft D1 with a debounced,
    changeSet-only op → apply/publish D1 (sets `appliedAt`) → within the
    debounce window, open a new draft D2 and edit the same field of the same
    entity. The client reused D1's mutation, so the new optimistic mutation
    carried `changeSetRef=D1`; the server then rejected it in `verifyChangeSet`
    with `"The provided changeSetRef has already been applied"` (500). This
    affected every debounced changeSet-only operation.

    The three adapters now require
    `(mutation.changeSetRef ?? null) === (request.changeSetRef ?? null)` for a
    debounce match, matching the behavior `@roc-db/indexed-db` already had.
    Covered by a new shared conformance test that runs across all adapters.

## 0.2.0-pre.100

### Patch Changes

- [#14](https://github.com/eigilsagafos/roc-db/pull/14)
  [`50b2092`](https://github.com/eigilsagafos/roc-db/commit/50b2092eaa6bd1f26b0eec8d81131471dcb0e40b)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Type-check the
  whole monorepo and ship correct type declarations.

    Every package now type-checks with zero errors and no longer builds its
    `.d.ts` with `tsc --noCheck`, so the published declarations are actually
    verified. CI gains a repo-wide `typecheck` gate.

    Consumer-facing type fixes in `@roc-db/valdres`'s `createValdresAdapter`:
    the `AtomFamily` params had swapped `<Value, Args>` generics and non-tuple
    `Args` (which silently degraded to `any`);
    `entityAtom`/`mutationAtom`/`entityUniqueAtom`/ `entityIndexAtom` now have
    correct value-first/args-second generics matching runtime. `roc-db` also
    exports the document type as `EntityDocument`, tightens `Mutation`
    (`identityRef`/`sessionRef`/`persistedAt`/`appliedAt`), and makes
    `readOperation` accept an `outputSchema` setting (symmetric with
    `writeOperation`).

    Runtime bug fixes surfaced by the type-checking:

    - `WriteTransaction.redo` was never wired as an instance method (unlike
      `undo`), so the `redo` operation threw at runtime — now wired.
    - `patchEntity` removed **all** refs from an index array on update (a
      `ref !== ref` self-comparison) instead of just the patched entity's ref.

## 0.2.0-pre.99

### Patch Changes

- [#10](https://github.com/eigilsagafos/roc-db/pull/10)
  [`dbd2b24`](https://github.com/eigilsagafos/roc-db/commit/dbd2b241fd729a861f4c4e132b32548a7d17bfa4)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Add
  `txn.duplicateChangeSetMutations` and formalize the changeSet/version roles.

    **New in `roc-db`:**

    - `txn.duplicateChangeSetMutations(sourceChangeSetRef, targetChangeSetRef, options?)`
      — a `WriteTransaction` primitive that copies a changeSet's pending
      mutations into another changeSet with **fresh entity refs**, so the source
      and the copy can both be applied later without primary-key collisions
      (e.g. "duplicate this draft"). Copies are produced by **replaying** each
      operation, so the derived mutation logs stay consistent with the
      (optionally `transformPayload`-rewritten) payload. `options` accepts
      `filter` and `transformPayload`.
    - Entity role flags `changeSet: true` / `version: true`, validated at
      construction: a changeSet's data must declare `appliedAt` (and it can't
      also be a singleton/version); a version's data must declare `snapshot`.
    - New exported errors (all extend `BadRequestError`):
      `ChangeSetIntegrityError`, `ChangeSetNotEmptyError`,
      `SingletonDuplicationError`, `NotAChangeSetError`, `NotAVersionError`.
    - New exports: `loadChangeSetBase`, `entityKindsFromRefSchema`.
    - `Snowflake` now rolls into the next millisecond instead of throwing when
      the 12-bit per-ms sequence exhausts under a fixed timestamp (e.g.
      duplicating a very large changeSet).

    **Behavior change — action required:** the changeSet/version role checks are
    now enforced unconditionally (there is no opt-in flag). Any entity used as a
    `changeSetRef` must be declared `changeSet: true` (with `appliedAt` in its
    data), and a changeSet's `version` base-snapshot parent must reference a
    `version: true` entity — otherwise the adapter throws `NotAChangeSetError` /
    `NotAVersionError` (at construction for the parent-kind check, at runtime
    for ref-kind checks). Also declares `WriteTransaction.timestamp` and
    corrects the `SaveMutationFunction` type to receive the finalized mutation
    (matches every adapter implementation).

    `@roc-db/valdres` and `@roc-db/postgres` adapt `saveMutation` to key off the
    finalized mutation; valdres now seeds a changeSet's base via the shared
    `loadChangeSetBase`. `@roc-db/test-utils` gains a canonical `duplicateDraft`
    operation and marks its `Draft` / `PostVersion` fixtures with the new role
    flags.

- [#11](https://github.com/eigilsagafos/roc-db/pull/11)
  [`b2ed3f7`](https://github.com/eigilsagafos/roc-db/commit/b2ed3f76db301b0e76f0d5188289e2a902ce5004)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Fix type
  declaration emit for published packages. `@roc-db/valdres` now emits flat
  `.d.ts` files (previously nested under `dist/types/@roc-db/valdres/src/`
  because of deep imports into `roc-db` source), and `@roc-db/test-utils` now
  emits declarations for its `./setup` entry. The `types` paths declared in each
  package's `exports` now resolve to real files in the published tarball.
