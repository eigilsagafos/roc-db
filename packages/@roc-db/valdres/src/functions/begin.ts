import type { BeginFunction } from "roc-db"
import type { Store, TransactionInterface } from "valdres"
import type { ValdresEngine } from "../types/ValdresEngine"

export const begin: BeginFunction<ValdresEngine> = (engineOpts, callback) => {
    if (engineOpts.txn) {
        return callback({
            ...engineOpts,
            txn: engineOpts.txn,
            rootTxn: engineOpts.txn,
        })
    } else {
        return (engineOpts.store as Store).txn(rootTxn => {
            const txn = rootTxn as unknown as TransactionInterface
            return callback({
                ...engineOpts,
                txn,
                rootTxn: txn,
            })
        })
    }
}
