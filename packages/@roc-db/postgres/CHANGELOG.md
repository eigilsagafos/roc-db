# @roc-db/postgres

## 0.2.0-pre.102

### Patch Changes

- [#21](https://github.com/eigilsagafos/roc-db/pull/21)
  [`39c6a70`](https://github.com/eigilsagafos/roc-db/commit/39c6a703a90bd47d911c9001fea56b9a9ca88039)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Make operation
  replay version-aware.

    Operations already carried a `version` (default `1`), recorded on every
    mutation, but replay ignored it and resolved operations by name alone. Now
    an operation can be registered at multiple versions (same `name`, different
    `version`) and:

    - **Replay is version-pinned.** `findOperation` matches on both `name` and
      `version`, so `applyChangeSet`, `initializeChangeSet`, `loadMutations`,
      `persistOptimisticMutations`, and `duplicateChangeSetMutations` each run
      the exact version a mutation was authored with. A changeSet edited with
      `version: 1` still replays with the v1 callback after a `version: 2` is
      added — its logic doesn't silently change under it.
    - **New writes use the latest version.** When multiple versions share a
      name, the public adapter method (`adapter.myOp(...)`) invokes the highest
      `version`, independent of registration order.
    - **Duplicate registration is rejected.** Registering the same operation
      twice with the same `name` AND `version` now throws
      `DuplicateOperationError` at adapter construction (registering distinct
      versions is the supported path). New export: `DuplicateOperationError`.
    - **Built-in names are reserved.** Registering an operation named `undo`,
      `redo`, `pageMutations`, or `pageEntities` throws
      `ReservedOperationNameError` instead of silently shadowing the built-in.
      New export: `ReservedOperationNameError`.
    - A mutation whose recorded version is `undefined` resolves to version `1`
      (backwards compatible with the mutation schema's default and pre-`version`
      data).

    Also fixes a latent bug where `clone()` / `changeSet()` re-folded the
    built-in operations (`undo`/`redo`/`pageMutations`/`pageEntities`) into the
    stored operations list on every re-entry, so a cloned adapter's
    `_operations` / `_operationNames` accumulated duplicates. Built-ins are now
    registered exactly once.

    **Behavior change:** if a mutation's authored version is no longer
    registered, `findOperation` now throws
    `Operation "<name>" version <n> not found` instead of silently falling back
    to another version. Keep old versions registered as long as un-applied
    changeSets (or replayable history) may reference them.

    `@roc-db/postgres`: `postgresRowToMutation` now defaults a `NULL`
    `operation_version` column to `1`, so legacy rows round-trip as version `1`
    (matching the write path and mutation schema) instead of a type-violating
    `null`.

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
