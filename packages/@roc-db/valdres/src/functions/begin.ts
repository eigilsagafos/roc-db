import type { ValdresEngine } from "../types/ValdresEngine"

export const begin = (request, engineOpts: ValdresEngine, callback) => {
    let updatedOpts
    if (engineOpts.txn) {
        const { commit, ...rest } = engineOpts.txn
        const txn = { ...rest, commit: () => {} }
        return callback({
            ...engineOpts,
            txn: txn,
            rootTxn: txn,
        })
    }
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
