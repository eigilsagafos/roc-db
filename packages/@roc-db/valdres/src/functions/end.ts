import type { ValdresTransaction } from "../types/ValdresTransaction"

export const end = (txn: ValdresTransaction) => {
    txn.engineOpts.rootTxn.commit()
    if (txn.engineOpts.scopedStore) {
        txn.engineOpts.scopedStore.detach()
    }
}
