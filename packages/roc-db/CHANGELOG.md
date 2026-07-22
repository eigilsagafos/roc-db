# roc-db

## 0.2.0-pre.103

### Minor Changes

- [#24](https://github.com/eigilsagafos/roc-db/pull/24)
  [`ac2c47f`](https://github.com/eigilsagafos/roc-db/commit/ac2c47fcc50c4957676714bc9e30a8e8f1aa1915)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Built-in operations
  are now opt-in.

    `createAdapter` no longer implicitly registers `pageMutations` /
    `pageEntities` / `undo` / `redo`. Import the ones you want and include them
    in your own `operations` list:

    ```ts
    import { pageMutations, pageEntities, undo, redo } from "roc-db"

    createAdapter({
        operations: [pageMutations, pageEntities, undo, redo, ...myOperations],
        entities,
        // ...
    })
    ```

    Register only what you use. This keeps the adapter's operation surface to
    exactly what you declare, and removes a class of surprises: implicit methods
    you never registered, and built-ins doubling in a cloned adapter's operation
    list on `clone()` / `changeSet()` re-entry. If you use `undo` / `redo`
    inside changeSets, register them so replay can resolve those mutations.

    Each built-in is exported individually — `pageMutations`, `pageEntities`,
    `undo`, `redo`. `pageEntities` is now a plain operation (it was a
    `createPageEntitiesOperation(entities)` factory, but the `entities` argument
    was never used — entity paging resolves the set from the engine at runtime).
    Its payload now takes `entities` (an array of kinds, or `"*"`), the kind
    filter every adapter honors; the previous `include`/`exclude` keys were
    inert (no adapter read them, so kind filtering silently did nothing). The
    `ReservedOperationNameError` added alongside the previous auto-injection is
    removed; with nothing auto-registered there are no reserved names.

    **Migration:** if you relied on the implicit `adapter.undo()` /
    `adapter.redo()` / `adapter.pageMutations()` / `adapter.pageEntities()`,
    register those operations explicitly as shown above.

    `@roc-db/test-utils`: its `operations` fixture registers the built-ins
    explicitly, since the adapter no longer adds them automatically.

## 0.2.0-pre.102

### Minor Changes

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

- [#17](https://github.com/eigilsagafos/roc-db/pull/17)
  [`be8f388`](https://github.com/eigilsagafos/roc-db/commit/be8f3881c2fbaffa4ccf6c763fe70a7594faec26)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Include the
  offending `changeSetRef` in the `initializeChangeSet` error messages
  (`The provided changeSetRef "<ref>" has already been applied` /
  `... does not exist`), making it easier to identify which changeSet caused the
  failure.

## 0.2.0-pre.100

### Minor Changes

- [#16](https://github.com/eigilsagafos/roc-db/pull/16)
  [`0175da5`](https://github.com/eigilsagafos/roc-db/commit/0175da522b152e31b3b5304e24d45dbfa56eac3e)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Fix the
  one-transaction `duplicateChangeSetMutations` pattern, and make the primitive
  server-authoritative.

    - **Bug fix — one-transaction duplicate throwing `NotFoundError` for the
      target root.** When a cloned operation read its own changeSet root (a
      common validate/attach-against-the-root pattern), replay resolved that
      read against the persisted store — which does not yet contain the target
      changeSet root created moments earlier by the same _uncommitted_ outer
      operation — and threw `NotFoundError` for the target ref. The primitive
      now surfaces the outer transaction's own pending writes (from `txn.log`)
      onto the replay scratch cache, so same-transaction creations — most
      importantly the freshly-created target root — are visible to replay. The
      source base still takes precedence, so copies resolve their base against
      the source snapshot. Reproduced on the valdres and postgres adapters; now
      covered by a shared conformance test that runs across all adapters
      (in-memory, valdres, postgres, indexed-db). This makes the documented
      one-transaction pattern (create the target root, even with a
      `parents.version`, then duplicate, all in one write op) actually work.
    - **New error `OptimisticDuplicationError`** (extends `BadRequestError`).
      `duplicateChangeSetMutations` now throws it when invoked on an
      **optimistic adapter**. The primitive emits the source's mutations as N
      independent mutation records in the target changeSet; running the wrapping
      write operation optimistically would sync that operation's own mutation
      and re-run the primitive on replay (on the server, or on another client
      via `loadMutations`), double-executing it — producing duplicate copies, or
      a `ChangeSetNotEmptyError` when the target is already populated. Run the
      wrapping operation once on a non-optimistic (server) adapter and load the
      resulting mutations on clients; do not replay the wrapping operation on
      clients — load the granular copies it produced instead.

        **Action required:** the in-memory and valdres adapters default to
        `optimistic: true`. If you duplicate a changeSet from one of those,
        construct the adapter used for duplication with `optimistic: false`.

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

### Minor Changes

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
