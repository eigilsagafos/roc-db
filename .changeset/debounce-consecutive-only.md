---
"roc-db": minor
"@roc-db/in-memory": patch
"@roc-db/indexed-db": patch
"@roc-db/postgres": patch
"@roc-db/valdres": patch
"@roc-db/test-utils": patch
---

Fix: a debounced write only merges into the latest mutation, so a row never holds versions written before and after other mutations.

A mutation row has one position in replay order, but debounce merged any matching row in the window, including one that other mutations were written after. The intervening mutation then landed on the wrong side of one of the versions: the server rejected it live (`Entity not found`), changeSet init failed on replay (`Delete not allowed …`), or replay silently produced different content (a copy made between two versions lost the value it copied).

Now a debounced write merges into a row only when it is consecutive: the row is the latest mutation in its changeSet (or root) from any identity, and the identity has written nothing after it anywhere. Otherwise the write gets a new row, which later consecutive writes merge into, so typing still collapses into one row.

- **Adapter interface:** `findDebounceMutation` is replaced by `findRecentMutations(engineOpts, { changeSetRef, identityRef, since })`, which lists recent mutations; core picks the merge target. Several matching rows are no longer an error (postgres threw "TODO - handle more than one mutation", indexed-db rejected "Unhandled multiple debounced mutations"), and postgres no longer matches the payload ref through the first version's `log_refs`.
- **Merged versions** get `persistedAt: null` on optimistic adapters (the version is not synced yet) and the current time on others. Server-side writes kept the first version's `persistedAt`, so replay ran the latest version before mutations it depended on.
- **`persistOptimisticMutations`:** a client that merged into a row other mutations now follow (an older client, or one that had not seen another user's write) still has its version persisted, but as a fresh debounced write from its identity: merged into the row it would merge into today, or as a new row with a new ref. A resend of that version throws "Mutation already synced".

Replay order and stored mutations are unchanged, so existing changeSets open as before.
