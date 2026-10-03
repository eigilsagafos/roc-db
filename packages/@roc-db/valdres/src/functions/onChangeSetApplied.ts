import type { OnChangeSetAppliedFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"
import { peekScopeState } from "../lib/scopeState"
import { findScopeTransaction } from "../lib/scopeTransaction"

export const onChangeSetApplied: OnChangeSetAppliedFunction<ValdresEngine> = (
    txn,
    changeSetRef,
) => {
    const { store, rootTxn } = txn.engineOpts as ValdresTxnEngine
    // An adapter can be built on a bare transaction with no store (see
    // `begin`). There is no scope state — the registry is keyed by store — so
    // there is nothing to do rather than throw.
    if (!store) return
    // The changeSet's work now belongs to the root store, so the scope should
    // stop shadowing it. Resetting every atom and row the adapter wrote there
    // reverts both values and collection membership, while keeping the scope
    // and its subscriptions alive, so a UI still rendering the draft follows
    // the root from here on.
    //
    // Staged through the enclosing transaction rather than applied directly:
    // applying a changeSet is a single commit, and the revert has to land in it
    // so no subscriber observes the scope reverted but the apply not yet
    // written. A changeSet can be applied without its scope ever having been
    // opened here.
    //
    // The written set is kept: if this transaction rolls back, a later apply
    // still needs it. The cache is released, so the next request rebuilds it,
    // re-verifies the changeSet and rejects it as already applied. Dropping it
    // is safe either way, since a cache is only ever a copy.
    const scopeState = peekScopeState(store, changeSetRef)
    if (!scopeState) return
    scopeState.txnCache = undefined
    scopeState.cacheToken = undefined
    if (scopeState.written.size) {
        const scopedTxn = findScopeTransaction(rootTxn, changeSetRef)
        if (scopedTxn) {
            for (const state of scopeState.written) scopedTxn.reset(state as any)
        }
    }
}
