---
"roc-db": patch
---

Include the offending `changeSetRef` in the `initializeChangeSet` error messages (`The provided changeSetRef "<ref>" has already been applied` / `... does not exist`), making it easier to identify which changeSet caused the failure.
