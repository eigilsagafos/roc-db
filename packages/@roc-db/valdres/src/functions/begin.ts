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
            scopedStoreAlreadyAttachedBeforeBegin: true,
        })
    }

    engineOpts.store.txn(rootTxn => {
        if (request.changeSetRef) {
            const scopedStoreAlreadyAttachedBeforeBegin =
                !!engineOpts.store.data.scopes[request.changeSetRef]
            const scopedStore = engineOpts.store.scope(request.changeSetRef)
            rootTxn.scope(request.changeSetRef, scopedTxn => {
                updatedOpts = {
                    ...engineOpts,
                    txn: scopedTxn,
                    rootTxn,
                    scopedStoreAlreadyAttachedBeforeBegin,
                    scopedStore,
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
