import type { Entity } from "roc-db"
import type { ValdresWriteTransaction } from "../types/ValdresWriteTransaction"

export const commitCreate = (
    txn: ValdresWriteTransaction,
    document: Entity,
) => {
    const { ref, entity } = document
    const { entityAtom, entityRefListAtom } = txn.engineOpts
    txn.engineOpts.txn.set(entityAtom(ref), document)
    if (entityRefListAtom) {
        txn.engineOpts.txn.set(entityRefListAtom(entity), (curr: string[]) => [
            ...curr,
            ref,
        ])
    }
}
