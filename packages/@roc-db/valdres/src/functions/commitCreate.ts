import type { Entity } from "roc-db"
import type { ValdresWriteTransaction } from "../types/ValdresWriteTransaction"

export const commitCreate = (
    txn: ValdresWriteTransaction,
    document: Entity,
) => {
    throw new Error("commitCreate is not implemented")
    const { ref, entity } = document
    console.log("commitCreate", ref, document)
    const { entityAtom, entityRefListAtom, entityUniqueAtom } = txn.engineOpts
    txn.engineOpts.txn.set(entityAtom(ref), document)
    if (entityRefListAtom) {
        txn.engineOpts.txn.set(entityRefListAtom(entity), (curr: string[]) => [
            ...curr,
            ref,
        ])
    }
}
