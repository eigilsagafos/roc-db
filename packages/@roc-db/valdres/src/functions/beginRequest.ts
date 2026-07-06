import type { BeginRequestFunction, Ref } from "roc-db"
import type { Store, TransactionInterface } from "valdres"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"
import { generateTransactionCache } from "roc-db"

const selectScopedStore = (engineOpts: ValdresEngine, changeSetRef: Ref) => {
    const store = engineOpts.store as Store
    if (engineOpts.scopedStore && changeSetRef in store.data.scopes) {
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
            const scopedStoreAlreadyAttachedBeforeBegin =
                !!engineOpts.scopedStore
            const scopedStore = selectScopedStore(
                engineOpts,
                request.changeSetRef,
            )
            const { rootTxn } = engineOpts as ValdresTxnEngine
            return rootTxn.scope(request.changeSetRef, scopedTxn => {
                const scopedData = scopedTxn.data as any
                if (scopedStoreAlreadyAttachedBeforeBegin) {
                    scopedData.txnCache ||= generateTransactionCache(false)
                }
                return callback(
                    {
                        ...engineOpts,
                        txn: scopedTxn as unknown as TransactionInterface,
                        rootTxn,
                        scopedStoreAlreadyAttachedBeforeBegin,
                        scopedStore,
                    },
                    scopedData.txnCache,
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
