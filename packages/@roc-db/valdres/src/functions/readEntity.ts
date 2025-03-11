import { DELETED_IN_CHANGE_SET_SYMBOL, type Ref } from "roc-db"
import type { ValdresTransaction } from "../types/ValdresTransaction"

export const readEntity = (txn: ValdresTransaction, ref: Ref) => {
    const { entityAtom } = txn.engineOpts
    const doc = txn.engineOpts.txn.get(entityAtom(ref))
    if (doc === DELETED_IN_CHANGE_SET_SYMBOL) return undefined
    return doc
}
