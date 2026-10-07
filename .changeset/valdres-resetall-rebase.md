---
"@roc-db/valdres": minor
---

Rebase drafts in place with valdres `Transaction.resetAll()`. The peer range moves from `>=1.0.0-beta.41 <2.0.0` to `>=1.0.0-beta.42 <2.0.0`; `resetAll()` first shipped in `valdres@1.0.0-beta.42`.

When a draft's `parents.version` changes, `adapter.changeSet(ref)` now clears the draft's scope with `resetAll()` and rebuilds it from the new base and the draft's full history, all in one transaction. That transaction is the caller's when the adapter was built on one (`clone({ txn })`), and the adapter's own otherwise.

- **The scope keeps its identity.** Previously the scope was disposed and replaced, so anything rendering it got `StoreDisposedError` and had to re-open the draft. Now the same scope, its subscriptions and its read-only child views stay attached, and each affected subscription is notified once, with the rebuilt state.
- **Composes with the caller's transaction.** `changeSet()` inside a caller's transaction now rebuilds a rebased draft instead of throwing `ChangeSetRebasedError`. If that transaction throws, the draft is left untouched on its old base.
- **Batches clear in place.** A batch (`loadMutations` / `persistOptimisticMutations`) that writes to a rebased draft now clears its scope in place instead of replacing it. The next `adapter.changeSet(ref)` rebuilds it.
- **Stale requests still throw.** A request reaching a rebased draft's scope before it has been re-opened still throws `ChangeSetRebasedError`; open the draft again with `adapter.changeSet(ref)`, inside or outside a transaction.

Unchanged: applying a draft still leaves its scope as it is (consumers render from the root), and a draft still shows the live root plus its version snapshot and its own edits.
