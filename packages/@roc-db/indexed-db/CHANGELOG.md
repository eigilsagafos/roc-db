# @roc-db/indexed-db

## 0.2.0-pre.99

### Patch Changes

- [#12](https://github.com/eigilsagafos/roc-db/pull/12)
  [`f48c634`](https://github.com/eigilsagafos/roc-db/commit/f48c63478e017896c17fffdacb209e61a0fd1640)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - The IndexedDB
  adapter now passes the shared adapter conformance suite
  (`testAdapterImplementation`), matching `@roc-db/in-memory` and
  `@roc-db/postgres`. Fixes the `begin()` transaction lifecycle (resolve only
  after the transaction commits, reuse the connection), honours the injected
  `snowflake` instead of always creating a new one, scopes debounce lookups by
  `identityRef`, and surfaces unique-constraint violations as `ConflictError`.
