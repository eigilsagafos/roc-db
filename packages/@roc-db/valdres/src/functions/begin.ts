import type { ValdresEngine } from "../types/ValdresEngine"

export const begin = (request, engineOpts: ValdresEngine, callback) => {
    let updatedOpts
    engineOpts.store.txn(rootTxn => {
        if (request.changeSetRef) {
            engineOpts.store.scope(request.changeSetRef)
            rootTxn.scope(request.changeSetRef, scopedTxn => {
                updatedOpts = {
                    ...engineOpts,
                    txn: scopedTxn,
                    rootTxn,
                }
            })
        } else {
            updatedOpts = {
                ...engineOpts,
                txn: rootTxn,
                rootTxn,
            }
        }
    })
    return callback(updatedOpts)
}
