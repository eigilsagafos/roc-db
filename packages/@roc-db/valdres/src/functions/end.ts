import type { ValdresTransaction } from "../types/ValdresTransaction"

export const end = (txn: ValdresTransaction) => {
    txn.engineOpts.rootTxn.commit()
    // txn.engineOpts.txn.commit()
}
