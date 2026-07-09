---
"@roc-db/in-memory": patch
"@roc-db/valdres": patch
"@roc-db/postgres": patch
"@roc-db/test-utils": patch
---

Fix: scope debounce matching by `changeSetRef` in the valdres, in-memory, and postgres adapters.

`findDebounceMutation` matched a debounce candidate by operation name + `payload.ref` + `identityRef` + time window, but **not** by `changeSetRef`. As a result, a debounced edit made in a new changeSet could reuse a mutation from a *different* changeSet, and `createMutation` would then inherit that mutation's stale `changeSetRef` via `{...res}`.

The concrete failure: edit an entity's field in draft D1 with a debounced, changeSet-only op → apply/publish D1 (sets `appliedAt`) → within the debounce window, open a new draft D2 and edit the same field of the same entity. The client reused D1's mutation, so the new optimistic mutation carried `changeSetRef=D1`; the server then rejected it in `verifyChangeSet` with `"The provided changeSetRef has already been applied"` (500). This affected every debounced changeSet-only operation.

The three adapters now require `(mutation.changeSetRef ?? null) === (request.changeSetRef ?? null)` for a debounce match, matching the behavior `@roc-db/indexed-db` already had. Covered by a new shared conformance test that runs across all adapters.
