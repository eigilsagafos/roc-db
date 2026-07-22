---
"roc-db": minor
"@roc-db/postgres": patch
---

Make operation replay version-aware.

Operations already carried a `version` (default `1`), recorded on every mutation, but replay ignored it and resolved operations by name alone. Now an operation can be registered at multiple versions (same `name`, different `version`) and:

- **Replay is version-pinned.** `findOperation` matches on both `name` and `version`, so `applyChangeSet`, `initializeChangeSet`, `loadMutations`, `persistOptimisticMutations`, and `duplicateChangeSetMutations` each run the exact version a mutation was authored with. A changeSet edited with `version: 1` still replays with the v1 callback after a `version: 2` is added — its logic doesn't silently change under it.
- **New writes use the latest version.** When multiple versions share a name, the public adapter method (`adapter.myOp(...)`) invokes the highest `version`, independent of registration order.
- **Duplicate registration is rejected.** Registering the same operation twice with the same `name` AND `version` now throws `DuplicateOperationError` at adapter construction (registering distinct versions is the supported path). New export: `DuplicateOperationError`.
- A mutation whose recorded version is `undefined` resolves to version `1` (backwards compatible with the mutation schema's default and pre-`version` data).

Also fixes a latent bug where `clone()` / `changeSet()` re-folded the built-in operations (`undo`/`redo`/`pageMutations`/`pageEntities`) into the stored operations list on every re-entry, so a cloned adapter's `_operations` / `_operationNames` accumulated duplicates. Built-ins are now registered exactly once.

**Behavior change:** if a mutation's authored version is no longer registered, `findOperation` now throws `Operation "<name>" version <n> not found` instead of silently falling back to another version. Keep old versions registered as long as un-applied changeSets (or replayable history) may reference them.

`@roc-db/postgres`: `postgresRowToMutation` now defaults a `NULL` `operation_version` column to `1`, so legacy rows round-trip as version `1` (matching the write path and mutation schema) instead of a type-violating `null`.
