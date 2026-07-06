---
"roc-db": patch
---

`applyChangeSetSync` and `applyChangeSetAsync` now wrap each mutation's callback in a try/catch and re-throw with mutation context (the failing mutation's `ref`, `operation.name`, and `timestamp`) while preserving the original error via `Error.cause`. This makes it far easier to identify which mutation in a changeset failed when re-applying against the latest state.

Note: errors thrown while applying a changeset are now always wrapped in a plain `Error`. Callers that previously branched on the original error type (e.g. `catch (e) { if (e instanceof NotFoundError) ... }`) should read `error.cause` to recover the original typed error. Signatures are unchanged.
