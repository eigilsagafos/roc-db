import { type Ref } from "roc-db"
import type { ValdresTransaction } from "../types/ValdresTransaction"

export const readEntity = (txn: ValdresTransaction, ref: Ref) => {
    const { entityAtom } = txn.engineOpts
    return txn.engineOpts.rootTxn.get(entityAtom(ref))
}
