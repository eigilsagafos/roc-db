# @roc-db/valdres

## 0.2.0-pre.103

### Minor Changes

- [#31](https://github.com/eigilsagafos/roc-db/pull/31)
  [`6ba8670`](https://github.com/eigilsagafos/roc-db/commit/6ba86709358265e4901f042e6d612379183a8ddd)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Rebase drafts in
  place with valdres `Transaction.resetAll()`. The peer range moves from
  `>=1.0.0-beta.41 <2.0.0` to `>=1.0.0-beta.42 <2.0.0`; `resetAll()` first
  shipped in `valdres@1.0.0-beta.42`.

    When a draft's `parents.version` changes, `adapter.changeSet(ref)` now
    clears the draft's scope with `resetAll()` and rebuilds it from the new base
    and the draft's full history, all in one transaction. That transaction is
    the caller's when the adapter was built on one (`clone({ txn })`), and the
    adapter's own otherwise.

    - **The scope keeps its identity.** Previously the scope was disposed and
      replaced, so anything rendering it got `StoreDisposedError` and had to
      re-open the draft. Now the same scope, its subscriptions and its read-only
      child views stay attached, and each affected subscription is notified
      once, with the rebuilt state.
    - **Composes with the caller's transaction.** `changeSet()` inside a
      caller's transaction now rebuilds a rebased draft instead of throwing
      `ChangeSetRebasedError`. If that transaction throws, the draft is left
      untouched on its old base.
    - **Batches clear in place.** A batch (`loadMutations` /
      `persistOptimisticMutations`) that writes to a rebased draft now clears
      its scope in place instead of replacing it. The next
      `adapter.changeSet(ref)` rebuilds it.
    - **Stale requests still throw.** A request reaching a rebased draft's scope
      before it has been re-opened still throws `ChangeSetRebasedError`; open
      the draft again with `adapter.changeSet(ref)`, inside or outside a
      transaction.

    Unchanged: applying a draft still leaves its scope as it is (consumers
    render from the root), and a draft still shows the live root plus its
    version snapshot and its own edits.

- [#29](https://github.com/eigilsagafos/roc-db/pull/29)
  [`34ab019`](https://github.com/eigilsagafos/roc-db/commit/34ab019bd7d0431beea7f7519264ae07d7532829)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Support the valdres
  1.0 betas. Verified against `valdres@1.0.0-beta.41`; the `@roc-db/valdres`
  peer range moves from `>=1.0.0-beta.20 <2.0.0` to `>=1.0.0-beta.41 <2.0.0`.

    valdres `1.0.0-beta.24` replaced its legacy beta API. Before this release,
    `@roc-db/valdres` could not be loaded with beta.24 or later
    (`Export named 'atomFamily' not found`), even though its peer range allowed
    them.

    **Breaking (`@roc-db/valdres`):** `createValdresAdapter` takes valdres 1.0
    state definitions instead of `atomFamily()` families:

    ```ts
    import { atom, collection, family, store } from "valdres"

    createValdresAdapter({
        store: store(),
        entityAtom: collection<string, EntityDocument>(),
        mutationAtom: collection<string, Mutation>(),
        entityUniqueAtom: family(
            (entity: string, key: string, value: string | number | boolean) =>
                atom<Ref | null>(null),
        ),
        entityIndexAtom: family(
            (entity: string, key: string, value: string | number | boolean) =>
                atom<Ref[]>([]),
        ),
        // ...
    })
    ```

    Entities and mutations are collections because the adapter lists them, and
    valdres families no longer have membership. Reading an absent entity or
    mutation row straight from the store returns `undefined` (it was `null`);
    the adapter's own `readEntity` / `readMutation` still return `null`.
    `store`, `txn` and `rootTxn` are the valdres 1.0 `Store` and `Transaction`
    types. The package now also exports `ChangeSetScopeNotOpenError`,
    `ChangeSetRebasedError` and the `EntityCollection`, `MutationCollection`,
    `EntityUniqueFamily` and `EntityIndexFamily` types.

    `async: true` is now rejected when the adapter is created: valdres 1.0
    transactions only accept synchronous callbacks, so every async operation
    failed.

    **New (`roc-db`):** an optional, synchronous
    `prepareChangeSets(engineOpts, changeSetRefs)` adapter function, called by
    `loadMutations` and `persistOptimisticMutations` before their transaction
    opens, with every changeSet the batch writes to. valdres cannot open a scope
    inside a transaction, so the valdres adapter uses it to open those scopes
    first. With an older `roc-db`, a batch writing to a changeSet whose scope is
    not open throws `ChangeSetScopeNotOpenError`.

    Other behavior:

    - Every request is still one valdres transaction covering the root store and
      the changeSet scope, so subscribers are notified once per write and a
      failed write commits nothing. An adapter built on a caller's transaction
      (`clone({ txn })`) composes into it, including `changeSet()` on a scope
      that is already open. Inside a caller's transaction a scope cannot be
      opened; that throws `ChangeSetScopeNotOpenError`.
    - **Breaking:** applying a changeSet no longer reverts its scope. Once a
      draft is applied, render from the root store, and dispose the draft's
      scope when you are done with it. valdres 1.0 has no `unsetAll()`, and a
      scope reverted row by row would not keep the root's ordering anyway.
    - A changeSet adapter whose scope was disposed now throws
      `StoreDisposedError` instead of writing into a fresh, unseeded scope. Call
      `adapter.changeSet(ref)` again to get a new scope, seeded and replayed.
    - Rebasing a draft (changing its `parents.version`) now rebuilds its scope.
      `adapter.changeSet(ref)`, and any batch writing to the draft, replace a
      scope built from another version with a new one built from the new base
      and the draft's full history. Like before, a scope cannot be rebuilt in
      place, so the old scope is disposed: re-open the draft after a rebase.
      Requests through a changeSet adapter opened before the rebase throw
      `ChangeSetRebasedError` instead of serving the old base, and so does
      `changeSet()` inside a caller's transaction. Before, a rebased draft kept
      serving its old base.
    - Deleting an entity inside a changeSet now hides it in the scope
      (`delete(row)`). Before, the scope's value fell through to the root while
      the entity dropped out of the scope's membership.
    - Fixed: a unique value freed inside a changeSet (a changed slug, a deleted
      entity) stayed taken in that changeSet, because the scope fell back to the
      root's entry. Lookups found the old entity and creating a new one with
      that value threw a unique-constraint error. A unique entry now only counts
      while its entity, as the changeSet sees it, still carries the value.
    - Fixed: a changeSet write that failed, or whose enclosing transaction
      rolled back, could leave its changes in the changeSet's shared cache, so
      later requests on that changeSet saw them. The cache is now only reused
      while it matches committed valdres state, and is released when the
      changeSet is applied.
    - Fixed: `adapter.changeSet(ref)` on a scope that something else opened (a
      batch load, application code, a re-creation after disposal) replayed only
      part of the history over it. That could overwrite loaded edits with the
      base snapshot, or newer rows with older ones. It now rebuilds such a scope
      from the base and the full history. Until then, a scope opened that way
      holds only what was written to it.
    - Fixed: a store-less adapter (`clone({ store: undefined, txn })`) wrote
      changeSet mutations it loaded straight into the root, and its
      `changeSet()` threw a TypeError. Both now work against the changeSet's
      scope, which must be open.
    - A read on a changeSet commits nothing, except the first read after its
      cache was rebuilt, which records a cache token in the scope.
    - valdres 1.0 forbids store work inside a `notify` subscriber
      (`CallbackCapabilityError`), so calling the adapter from one throws. Write
      in a `settle` handler through its transaction,
      `store.sub(state, { settle: tx => adapter.clone({ txn: tx }).someOperation(...) })`,
      or defer the call with `queueMicrotask`.
    - A named valdres 1.0 scope is one shared handle, and `dispose()` ends it
      for everyone, including the changeSet adapter. A UI should read through
      its own child, `store.scope(changeSetRef).scope()`, and dispose only that.
    - valdres 1.0 does not freeze stored values. The adapter never mutates
      values it has written or read; the test suite now runs the shared adapter
      conformance tests a second time with every stored value deep-frozen to
      keep that checked.

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
