import type { WriteRequest } from "roc-db"
import type { ValdresEngine } from "../types/ValdresEngine"

export const beginRequest = (
    request: WriteRequest,
    engineOpts: ValdresEngine,
    callback,
) => {
    if (request.changeSetRef) {
        if (engineOpts.store) {
            const scopedStoreAlreadyAttachedBeforeBegin =
                !!engineOpts.store.data.scopes[request.changeSetRef]
            const scopedStore = engineOpts.store.scope(request.changeSetRef)
            return engineOpts.rootTxn.scope(request.changeSetRef, scopedTxn => {
                return callback({
                    ...engineOpts,
                    txn: scopedTxn,
                    rootTxn: engineOpts.rootTxn,
                    scopedStoreAlreadyAttachedBeforeBegin,
                    scopedStore,
                })
            })
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
    } else {
        return callback(engineOpts)
    }
}
