import type { ValdresEngine } from "../types/ValdresEngine"

export const begin = (engineOpts: ValdresEngine, callback) => {
    if (engineOpts.txn) {
        return callback({
            ...engineOpts,
            txn: engineOpts.txn,
            rootTxn: engineOpts.txn,
        })
    } else {
        return engineOpts.store.txn(rootTxn => {
            return callback({
                ...engineOpts,
                txn: rootTxn,
                rootTxn,
            })
        })
    }
}
