import type { WriteRequest } from "roc-db"
import type { ValdresEngine } from "../types/ValdresEngine"
import { generateTransactionCache } from "../../../../roc-db/src/lib/generateTransactionCache"

const selectScopedStore = (engineOpts: ValdresEngine, changeSetRef) => {
    if (
        engineOpts.scopedStore &&
        changeSetRef in engineOpts.store.data.scopes
    ) {
        return engineOpts.scopedStore
    } else {
        return engineOpts.store.scope(changeSetRef)
    }
}

export const beginRequest = (
    request: WriteRequest,
    engineOpts: ValdresEngine,
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
            return engineOpts.rootTxn.scope(request.changeSetRef, scopedTxn => {
                if (scopedStoreAlreadyAttachedBeforeBegin) {
                    scopedTxn.data.txnCache ||= generateTransactionCache(false)
                }
                return callback(
                    {
                        ...engineOpts,
                        txn: scopedTxn,
                        rootTxn: engineOpts.rootTxn,
                        scopedStoreAlreadyAttachedBeforeBegin,
                        scopedStore,
                    },
                    scopedTxn.data.txnCache,
                )
            })
        } else {
            if (engineOpts.txn && engineOpts.rootTxn) {
                return callback(engineOpts)
            } else {
                let scopedTxn
                engineOpts.txn.scope(request.changeSetRef, txn => {
                    scopedTxn = txn
                })
                return callback({
                    ...engineOpts,
                    txn: scopedTxn,
                    rootTxn: engineOpts.txn,
                })
            }
        }
    } else {
        return callback(engineOpts)
    }
}
