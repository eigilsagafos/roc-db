---
"@roc-db/valdres": minor
"roc-db": minor
---

Support the valdres 1.0 betas. Verified against `valdres@1.0.0-beta.41`; the `@roc-db/valdres` peer range moves from `>=1.0.0-beta.20 <2.0.0` to `>=1.0.0-beta.41 <2.0.0`.

valdres `1.0.0-beta.24` replaced its legacy beta API. Before this release, `@roc-db/valdres` could not be loaded with beta.24 or later (`Export named 'atomFamily' not found`), even though its peer range allowed them.

**Breaking (`@roc-db/valdres`):** `createValdresAdapter` takes valdres 1.0 state definitions instead of `atomFamily()` families:

```ts
import { atom, collection, family, store } from "valdres"

createValdresAdapter({
    store: store(),
    entityAtom: collection<string, EntityDocument>(),
    mutationAtom: collection<string, Mutation>(),
    entityUniqueAtom: family((entity: string, key: string, value: string | number | boolean) => atom<Ref | null>(null)),
    entityIndexAtom: family((entity: string, key: string, value: string | number | boolean) => atom<Ref[]>([])),
    // ...
})
```

Entities and mutations are collections because the adapter lists them, and valdres families no longer have membership. Reading an absent entity or mutation row straight from the store returns `undefined` (it was `null`); the adapter's own `readEntity` / `readMutation` still return `null`. `store`, `txn` and `rootTxn` are the valdres 1.0 `Store` and `Transaction` types. The package now also exports `ChangeSetScopeNotOpenError`, `ChangeSetRebasedError` and the `EntityCollection`, `MutationCollection`, `EntityUniqueFamily` and `EntityIndexFamily` types.

`async: true` is now rejected when the adapter is created: valdres 1.0 transactions only accept synchronous callbacks, so every async operation failed.

**New (`roc-db`):** an optional, synchronous `prepareChangeSets(engineOpts, changeSetRefs)` adapter function, called by `loadMutations` and `persistOptimisticMutations` before their transaction opens, with every changeSet the batch writes to. valdres cannot open a scope inside a transaction, so the valdres adapter uses it to open those scopes first. With an older `roc-db`, a batch writing to a changeSet whose scope is not open throws `ChangeSetScopeNotOpenError`.

Other behavior:

- Every request is still one valdres transaction covering the root store and the changeSet scope, so subscribers are notified once per write and a failed write commits nothing. An adapter built on a caller's transaction (`clone({ txn })`) composes into it, including `changeSet()` on a scope that is already open. Inside a caller's transaction a scope cannot be opened; that throws `ChangeSetScopeNotOpenError`.
- **Breaking:** applying a changeSet no longer reverts its scope. Once a draft is applied, render from the root store, and dispose the draft's scope when you are done with it. valdres 1.0 has no `unsetAll()`, and a scope reverted row by row would not keep the root's ordering anyway.
- A changeSet adapter whose scope was disposed now throws `StoreDisposedError` instead of writing into a fresh, unseeded scope. Call `adapter.changeSet(ref)` again to get a new scope, seeded and replayed.
- Rebasing a draft (changing its `parents.version`) now rebuilds its scope. `adapter.changeSet(ref)`, and any batch writing to the draft, replace a scope built from another version with a new one built from the new base and the draft's full history. Like before, a scope cannot be rebuilt in place, so the old scope is disposed: re-open the draft after a rebase. Requests through a changeSet adapter opened before the rebase throw `ChangeSetRebasedError` instead of serving the old base, and so does `changeSet()` inside a caller's transaction. Before, a rebased draft kept serving its old base.
- Deleting an entity inside a changeSet now hides it in the scope (`delete(row)`). Before, the scope's value fell through to the root while the entity dropped out of the scope's membership.
- Fixed: a unique value freed inside a changeSet (a changed slug, a deleted entity) stayed taken in that changeSet, because the scope fell back to the root's entry. Lookups found the old entity and creating a new one with that value threw a unique-constraint error. A unique entry now only counts while its entity, as the changeSet sees it, still carries the value.
- Fixed: a changeSet write that failed, or whose enclosing transaction rolled back, could leave its changes in the changeSet's shared cache, so later requests on that changeSet saw them. The cache is now only reused while it matches committed valdres state, and is released when the changeSet is applied.
- Fixed: `adapter.changeSet(ref)` on a scope that something else opened (a batch load, application code, a re-creation after disposal) replayed only part of the history over it. That could overwrite loaded edits with the base snapshot, or newer rows with older ones. It now rebuilds such a scope from the base and the full history. Until then, a scope opened that way holds only what was written to it.
- Fixed: a store-less adapter (`clone({ store: undefined, txn })`) wrote changeSet mutations it loaded straight into the root, and its `changeSet()` threw a TypeError. Both now work against the changeSet's scope, which must be open.
- A read on a changeSet commits nothing, except the first read after its cache was rebuilt, which records a cache token in the scope.
- valdres 1.0 forbids store work inside a `notify` subscriber (`CallbackCapabilityError`), so calling the adapter from one throws. Write in a `settle` handler through its transaction, `store.sub(state, { settle: tx => adapter.clone({ txn: tx }).someOperation(...) })`, or defer the call with `queueMicrotask`.
- A named valdres 1.0 scope is one shared handle, and `dispose()` ends it for everyone, including the changeSet adapter. A UI should read through its own child, `store.scope(changeSetRef).scope()`, and dispose only that.
- valdres 1.0 does not freeze stored values. The adapter never mutates values it has written or read; the test suite now runs the shared adapter conformance tests a second time with every stored value deep-frozen to keep that checked.
