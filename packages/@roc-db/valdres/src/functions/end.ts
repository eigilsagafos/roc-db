import type { ValdresTransaction } from "../types/ValdresTransaction"

export const end = (txn: ValdresTransaction) => {
    // txn.engineOpts.rootTxn.commit()
    // WARNING: We treat the valdres adapter as a optimistic adapter, so we don't save the mutations on the root store
    txn.engineOpts.txn.commit()
    if (
        txn.engineOpts.scopedStore &&
        txn.engineOpts.scopedStoreAlreadyAttachedBeforeBegin
    ) {
        txn.engineOpts.scopedStore.detach()
    }
}
