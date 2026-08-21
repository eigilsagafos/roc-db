import type { BeginRequestFunction, Ref } from "roc-db"
import type { Store, TransactionInterface } from "valdres"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"
import { generateTransactionCache } from "roc-db"
import { getScopeState } from "../lib/scopeState"

const selectScopedStore = (engineOpts: ValdresEngine, changeSetRef: Ref) => {
    const store = engineOpts.store as Store
    if (engineOpts.scopedStore && store.hasScope(changeSetRef)) {
        return engineOpts.scopedStore
    } else {
        return store.scope(changeSetRef)
    }
}

export const beginRequest: BeginRequestFunction<ValdresEngine> = (
    request,
    engineOpts,
    callback,
) => {
    if (request.changeSetRef) {
        if (engineOpts.store) {
            const changeSetRef = request.changeSetRef
            const scopedStoreAlreadyAttachedBeforeBegin =
                !!engineOpts.scopedStore
            const scopedStore = selectScopedStore(engineOpts, changeSetRef)
            const { rootTxn } = engineOpts as ValdresTxnEngine
            return rootTxn.scope(changeSetRef, scopedTxn => {
                const scopeState = getScopeState(
                    engineOpts.store as Store,
                    changeSetRef,
                    scopedStore,
                )
                if (scopedStoreAlreadyAttachedBeforeBegin) {
                    scopeState.txnCache ||= generateTransactionCache(false)
                }
                return callback(
                    {
                        ...engineOpts,
                        txn: scopedTxn as unknown as TransactionInterface,
                        rootTxn,
                        scopedStoreAlreadyAttachedBeforeBegin,
                        scopedStore,
                    },
                    scopeState.txnCache,
                )
            })
        } else {
            if (engineOpts.txn && engineOpts.rootTxn) {
                return callback(engineOpts)
            } else {
                const { txn: valdresTxn } = engineOpts as ValdresTxnEngine
                let scopedTxn
                valdresTxn.scope(request.changeSetRef, txn => {
                    scopedTxn = txn
                })
                return callback({
                    ...engineOpts,
                    txn: scopedTxn,
                    rootTxn: valdresTxn,
                })
            }
        }
    } else {
        return callback(engineOpts)
    }
}
