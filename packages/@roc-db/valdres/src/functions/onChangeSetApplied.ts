import type { OnChangeSetAppliedFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"
import { deleteScopeState } from "../lib/scopeState"

export const onChangeSetApplied: OnChangeSetAppliedFunction<ValdresEngine> = (
    txn,
    changeSetRef,
) => {
    const { store, rootTxn } = txn.engineOpts as ValdresTxnEngine
    // An adapter can be built on a bare transaction with no store (see
    // `begin`). There is no scope state to drop — the registry is keyed by
    // store — and no handle to ask whether the scope exists, since the probe
    // lives on Store and not on Transaction. Nothing to do rather than throw.
    if (!store) return
    // The changeSet's work now belongs to the root store, so the scope should
    // stop shadowing it. `unsetAll` reverts every value the scope owns — atom
    // values and family membership, in both directions — while keeping the
    // scope, its leases and its subscriptions alive, so a UI still rendering
    // the draft follows the root from here on.
    //
    // Staged through the enclosing transaction rather than applied directly:
    // applying a changeSet is a single commit, and the revert has to land in it
    // so no subscriber observes the scope reverted but the apply not yet
    // written. `Transaction.scope` throws on a scope that does not exist, and a
    // changeSet can be applied without ever having been opened here.
    if (store.hasScope(changeSetRef)) {
        rootTxn.scope(changeSetRef, scopedTxn => scopedTxn.unsetAll())
    }
    // Drop this adapter's own scope state too. Beyond releasing the cache, it
    // is what makes a later request re-verify the changeSet and reject it as
    // already applied.
    deleteScopeState(store, changeSetRef)
}
