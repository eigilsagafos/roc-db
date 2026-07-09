---
"roc-db": minor
"@roc-db/test-utils": patch
---

Fix the one-transaction `duplicateChangeSetMutations` pattern, and make the primitive server-authoritative.

- **Bug fix — one-transaction duplicate throwing `NotFoundError` for the target root.** When a cloned operation read its own changeSet root (a common validate/attach-against-the-root pattern), replay resolved that read against the persisted store — which does not yet contain the target changeSet root created moments earlier by the same *uncommitted* outer operation — and threw `NotFoundError` for the target ref. The primitive now surfaces the outer transaction's own pending writes (from `txn.log`) onto the replay scratch cache, so same-transaction creations — most importantly the freshly-created target root — are visible to replay. The source base still takes precedence, so copies resolve their base against the source snapshot. Reproduced on the valdres and postgres adapters; now covered by a shared conformance test that runs across all adapters (in-memory, valdres, postgres, indexed-db). This makes the documented one-transaction pattern (create the target root, even with a `parents.version`, then duplicate, all in one write op) actually work.

- **New error `OptimisticDuplicationError`** (extends `BadRequestError`). `duplicateChangeSetMutations` now throws it when invoked on an **optimistic adapter**. The primitive emits the source's mutations as N independent mutation records in the target changeSet; running the wrapping write operation optimistically would sync that operation's own mutation and re-run the primitive on replay (on the server, or on another client via `loadMutations`), double-executing it — producing duplicate copies, or a `ChangeSetNotEmptyError` when the target is already populated. Run the wrapping operation once on a non-optimistic (server) adapter and load the resulting mutations on clients; do not replay the wrapping operation on clients — load the granular copies it produced instead.

  **Action required:** the in-memory and valdres adapters default to `optimistic: true`. If you duplicate a changeSet from one of those, construct the adapter used for duplication with `optimistic: false`.
