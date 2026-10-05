import type { OnChangeSetAppliedFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"
import { peekScopeState } from "../lib/scopeState"

// The changeSet's work now belongs to the root store. Its scope is left as it
// is: once a changeSet is applied, consumers render from the root, and dispose
// the scope when they are done with it.
//
// The scope's transaction cache is released, so the next request on the
// changeSet rebuilds it, re-verifies the changeSet and rejects it as already
// applied. Dropping it is safe even if this transaction rolls back, since a
// cache is only ever a copy.
export const onChangeSetApplied: OnChangeSetAppliedFunction<ValdresEngine> = (
    txn,
    changeSetRef,
) => {
    const { store } = txn.engineOpts as ValdresTxnEngine
    // A store-less adapter has no scope state: the registry is keyed by store.
    if (!store) return
    const scopeState = peekScopeState(store, changeSetRef)
    if (!scopeState) return
    scopeState.txnCache = undefined
    scopeState.cacheToken = undefined
}
