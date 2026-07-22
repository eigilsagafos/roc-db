---
"roc-db": minor
"@roc-db/postgres": patch
"@roc-db/test-utils": patch
---

Make operation replay version-aware, and stop auto-injecting the built-in operations.

Operations already carried a `version` (default `1`), recorded on every mutation, but replay ignored it and resolved operations by name alone. Now an operation can be registered at multiple versions (same `name`, different `version`) and:

- **Replay is version-pinned.** `findOperation` matches on both `name` and `version`, so `applyChangeSet`, `initializeChangeSet`, `loadMutations`, `persistOptimisticMutations`, and `duplicateChangeSetMutations` each run the exact version a mutation was authored with. A changeSet edited with `version: 1` still replays with the v1 callback after a `version: 2` is added — its logic doesn't silently change under it.
- **New writes use the latest version.** When multiple versions share a name, the public adapter method (`adapter.myOp(...)`) invokes the highest `version`, independent of registration order.
- **Duplicate registration is rejected.** Registering the same operation twice with the same `name` AND `version` throws `DuplicateOperationError` at adapter construction (registering distinct versions is the supported path). New export: `DuplicateOperationError`.
- A mutation whose recorded version is `undefined` resolves to version `1` (backwards compatible with the mutation schema's default and pre-`version` data).

**Behavior change — built-in operations are now opt-in.** `createAdapter` no longer implicitly registers `pageMutations` / `pageEntities` / `undo` / `redo`. Include the ones you want in your own `operations` list. The simplest path is the new `createBuiltInOperations(entities)` helper:

```ts
import { createBuiltInOperations } from "roc-db"

createAdapter({
    operations: [...createBuiltInOperations(entities), ...myOperations],
    entities,
    // ...
})
```

The individual operations are also exported (`pageMutations`, `createPageEntitiesOperation`, `undo`, `redo`) if you only want some. This keeps the adapter's surface to exactly what you declare and removes a class of surprises (implicit methods, and built-ins doubling in a cloned adapter's operation list). If you use `undo`/`redo` inside changeSets, register them so replay can resolve those mutations.

**Behavior change:** if a mutation's authored version is no longer registered, `findOperation` now throws `Operation "<name>" version <n> not found` instead of silently falling back to another version. Keep old versions registered as long as un-applied changeSets (or replayable history) may reference them.

`@roc-db/postgres`: `postgresRowToMutation` now defaults a `NULL` `operation_version` column to `1`, so legacy rows round-trip as version `1` (matching the write path and mutation schema) instead of a type-violating `null`.

`@roc-db/test-utils`: its `operations` fixture now includes `createBuiltInOperations(entities)`, since the adapter no longer adds them automatically.
