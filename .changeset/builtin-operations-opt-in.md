---
"roc-db": minor
"@roc-db/test-utils": patch
---

Built-in operations are now opt-in.

`createAdapter` no longer implicitly registers `pageMutations` / `pageEntities` / `undo` / `redo`. Import the ones you want and include them in your own `operations` list:

```ts
import { pageMutations, pageEntities, undo, redo } from "roc-db"

createAdapter({
    operations: [pageMutations, pageEntities, undo, redo, ...myOperations],
    entities,
    // ...
})
```

Register only what you use. This keeps the adapter's operation surface to exactly what you declare, and removes a class of surprises: implicit methods you never registered, and built-ins doubling in a cloned adapter's operation list on `clone()` / `changeSet()` re-entry. If you use `undo` / `redo` inside changeSets, register them so replay can resolve those mutations.

Each built-in is exported individually — `pageMutations`, `pageEntities`, `undo`, `redo`. `pageEntities` is now a plain operation (it was a `createPageEntitiesOperation(entities)` factory, but the `entities` argument was never used — entity paging resolves the set from the engine at runtime). Its payload now takes `entities` (an array of kinds, or `"*"`), the kind filter every adapter honors; the previous `include`/`exclude` keys were inert (no adapter read them, so kind filtering silently did nothing). The `ReservedOperationNameError` added alongside the previous auto-injection is removed; with nothing auto-registered there are no reserved names.

**Migration:** if you relied on the implicit `adapter.undo()` / `adapter.redo()` / `adapter.pageMutations()` / `adapter.pageEntities()`, register those operations explicitly as shown above.

`@roc-db/test-utils`: its `operations` fixture registers the built-ins explicitly, since the adapter no longer adds them automatically.
