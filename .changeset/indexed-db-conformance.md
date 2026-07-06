---
"@roc-db/indexed-db": patch
---

The IndexedDB adapter now passes the shared adapter conformance suite (`testAdapterImplementation`), matching `@roc-db/in-memory` and `@roc-db/postgres`. Fixes the `begin()` transaction lifecycle (resolve only after the transaction commits, reuse the connection), honours the injected `snowflake` instead of always creating a new one, scopes debounce lookups by `identityRef`, and surfaces unique-constraint violations as `ConflictError`.
