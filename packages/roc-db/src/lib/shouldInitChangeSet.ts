import type { Transaction } from "../types/Transaction"

export const shouldInitChangeSet = (txn: Transaction<any, any, any, any>) => {
    if (txn.engineOpts.scopedStoreAlreadyAttachedBeforeBegin) return false
    if (txn.request.changeSetRef) return true
    //     {
    //     if (
    //         txn.adapterOpts.changeSetRef &&
    //         txn.adapterOpts.changeSetInitialized
    //         // &&
    //         // txn.adapterOpts.initChangeSetOnce
    //     ) {
    //         return false
    //     } else {
    //         return true
    //     }
    // }
    return false
}
