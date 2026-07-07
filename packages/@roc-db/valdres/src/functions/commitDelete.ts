import { type Ref } from "roc-db"
import type { ValdresTxnEngine } from "../types/ValdresEngine"
import type { ValdresWriteTransaction } from "../types/ValdresWriteTransaction"

export const commitDelete = (txn: ValdresWriteTransaction, ref: Ref) => {
    const {
        entityAtom,
        entityRefListAtom,
        txn: valdresTxn,
    } = txn.engineOpts as ValdresTxnEngine

    valdresTxn.del(entityAtom(ref))
    if (entityRefListAtom) {
        throw new Error("TODO support entityRefListAtom")
    }
    return 1
}
