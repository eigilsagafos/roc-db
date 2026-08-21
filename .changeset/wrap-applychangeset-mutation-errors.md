---
"roc-db": patch
---

Applying a changeset now surfaces which mutation failed. When a mutation's callback throws during `applyChangeSetSync`/`applyChangeSetAsync`, the error is re-thrown as a new exported `ApplyChangeSetError` that carries the failing mutation's `mutationRef`, `operationName`, and `timestamp` as structured fields (and in the message), while preserving the original error via `Error.cause`. This makes it far easier to identify exactly which mutation in a changeset failed when re-applying against the latest state.

```ts
try {
    txn.applyChangeSet(ref)
} catch (e) {
    if (e instanceof ApplyChangeSetError) {
        e.mutationRef // which mutation failed
        e.cause // the original error, e.g. NotFoundError
    }
}
```

Note: errors thrown while applying a changeset are now wrapped in `ApplyChangeSetError` rather than propagating the original error type directly. Callers that branched on the original type (e.g. `catch (e) { if (e instanceof NotFoundError) ... }`) should read `error.cause`. Signatures are unchanged; `ApplyChangeSetError` is a new export.
