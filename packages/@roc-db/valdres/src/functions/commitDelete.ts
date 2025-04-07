import { type Ref } from "roc-db"
import type { ValdresWriteTransaction } from "../types/ValdresWriteTransaction"

export const commitDelete = (txn: ValdresWriteTransaction, ref: Ref) => {
    const { entityAtom, entityRefListAtom } = txn.engineOpts

    txn.engineOpts.txn.del(entityAtom(ref))
    if (entityRefListAtom) {
        throw new Error("TODO support entityRefListAtom")
    }
    return 1
}
