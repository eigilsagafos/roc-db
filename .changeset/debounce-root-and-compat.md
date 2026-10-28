---
"roc-db": patch
"@roc-db/in-memory": patch
"@roc-db/indexed-db": patch
"@roc-db/postgres": patch
"@roc-db/valdres": patch
"@roc-db/test-utils": patch
---

Fix debounce follow-ups from ShiftX integration testing of 0.2.0-pre.105.

- **Replaying the stored mutations always matches what happened, in root as in changeSets.** A debounced write merges only into the latest mutation in its scope from any identity, and the server re-files a synced version whose row other mutations now follow. On optimistic adapters, the identity's own later writes anywhere also end coalescing; they are compared by `timestamp`, the order of the client's sync queue.
- **A retried re-filed version is skipped quietly**, like a resend of a version stored under its own ref, instead of throwing `Mutation already synced`.
- **Mismatched core and adapter versions fail at `createAdapter`.** An adapter that lacks a required function, such as one built for roc-db before 0.2.0-pre.105, now throws when it is created, naming the function, instead of on the first debounced write. Adapters peer on `roc-db >=0.2.0-pre.105`, so a newer adapter no longer installs next to an older core without a peer warning.
- **Narrower lookups.** `findRecentMutations` takes optional `scopeMutations` and `identityMutations` hints, so a server asks only for its scope's mutations. Adapters that ignore the hints (0.2.0-pre.105) return more mutations, which core handles. Because the identity's mutations are compared by `timestamp` only, indexed-db no longer misses rows that were later only by `persistedAt`.
- **`@roc-db/postgres`** exports `mutationsTableIndexes(tableName)`: indexes on `change_set_id`, and on root rows' `timestamp` and `persisted_at`, that serve these lookups and changeSet init. Create them with `CONCURRENTLY` on a live table.
- **`@roc-db/test-utils`** declares `@faker-js/faker` and `@roc-db/in-memory` as dependencies.
