import type { Transaction } from "../types/Transaction"

export const shouldInitChangeSet = (txn: Transaction<any, any, any, any>) => {
    if (txn.request.changeSetRef) {
        if (
            txn.adapterOpts.changeSetRef &&
            txn.adapterOpts.changeSetInitialized &&
            txn.adapterOpts.initChangeSetOnce
        ) {
            return false
        } else {
            return true
        }
    }
    return false
}
