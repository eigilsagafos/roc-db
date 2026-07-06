---
"roc-db": patch
---

`applyChangeSetSync` and `applyChangeSetAsync` now wrap each mutation's callback in a try/catch and re-throw with mutation context (the failing mutation's `ref`, `operation.name`, and `timestamp`) while preserving the original error via `Error.cause`. This makes it far easier to identify which mutation in a changeset failed when re-applying against the latest state. Purely additive — no public API or signature changes.
