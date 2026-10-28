---
"roc-db": patch
"@roc-db/in-memory": patch
"@roc-db/indexed-db": patch
"@roc-db/postgres": patch
"@roc-db/valdres": patch
"@roc-db/test-utils": patch
---

Fix debounce follow-ups from ShiftX integration testing of 0.2.0-pre.105.

- **Root writes no longer end coalescing or trigger rebases.** Root mutations are not replayed, so a root edit now only stops merging when the same identity wrote something else since, and only on optimistic adapters, whose sync queue that protects. A server merges a root write into the latest matching row, and `persistOptimisticMutations` only rebases changeSet versions. Before, any root write in the window from any identity (another user's login, a server-side session write) made the server store a user's next root version under a new ref.
- **A retried rebased version is skipped quietly**, like a resend of a version stored under its own ref, instead of throwing `Mutation already synced`.
- **Mismatched core and adapter versions fail at `createAdapter`.** An adapter that lacks a required function, such as one built for roc-db before 0.2.0-pre.105, now throws when it is created, naming the function, instead of on the first debounced write. Adapters peer on `roc-db >=0.2.0-pre.105`, so a newer adapter no longer installs next to an older core without a peer warning.
- **Narrower lookups.** `findRecentMutations` takes optional `scopeMutations` and `identityMutations` hints, so a server asks only for the changeSet's mutations or the identity's root mutations. Adapters that ignore the hints (0.2.0-pre.105) return more mutations, which core handles. The identity's mutations are compared by `timestamp` only, which also fixes indexed-db missing rows that were later only by `persistedAt`.
- **`@roc-db/postgres`** exports `mutationsTableIndexes(tableName)`: indexes on `change_set_id` and `(identity_ref, timestamp)` that serve these lookups and changeSet init. Create them with `CONCURRENTLY` on a live table.
- **`@roc-db/test-utils`** declares `@faker-js/faker` and `@roc-db/in-memory` as dependencies.
