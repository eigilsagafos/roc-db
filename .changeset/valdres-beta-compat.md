---
"@roc-db/valdres": minor
---

Support valdres `1.0.0-beta.20+`. The peer range moves from the exact pin `0.2.0-pre.18` to `>=1.0.0-beta.20 <2.0.0`.

valdres made its internal `store.data` and `txn.data` handles private in `1.0.0-beta.17`, and the adapter reached into both. Any changeSet flow threw `TypeError: Cannot read properties of undefined (reading 'versionRefLoaded')` on `1.0.0-beta.17` and later — which blocked upgrading to `1.0.0-beta.18`, the release that introduced `globalAtom()` / `globalAtomFamily()`.

The two pieces of state the adapter kept on the scope's `data` object — the per-scope transaction cache and the "base snapshot already seeded" flag — are roc-db concepts, so they now live in an adapter-owned registry keyed by `(store, changeSetRef)` instead of on valdres internals. Alongside that:

- The scope-existence check in `beginRequest` uses valdres' public `store.hasScope()` instead of probing `store.data.scopes`.
- The registry entry is tied to the scope's lifetime with `store.onDispose()`, so a scope that is destroyed and later re-opened under the same changeSet ref starts from clean state rather than inheriting the dead scope's cache and seeded-base flag.
- `onChangeSetApplied` cleans up the applied changeSet again. It had been silently optional-chaining into the removed `store.data`, so a scope's cache and seeded-base flag outlived the changeSet. It now drops the adapter's scope entry and reverts the valdres scope with `unsetAll()`, staged through the enclosing transaction so the revert lands in the same commit as the apply. A draft's scope no longer shadows the root once published — previously a UI still rendering that draft would sit at pre-apply state indefinitely.
- `end()` no longer calls `rootTxn.commit()`. valdres removed manual commit from the public transaction surface; the `store.txn` that `begin()` opens commits itself when the callback returns.

**Breaking:** valdres below `1.0.0-beta.20` is no longer supported — `ScopedStore` is not exported before `beta.18`, `unsetAll()` arrived in `beta.19`, and `store.hasScope()` / `store.onDispose()` in `beta.20`. Upgrade valdres alongside this release.
