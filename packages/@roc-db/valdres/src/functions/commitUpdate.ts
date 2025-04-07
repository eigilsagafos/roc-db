import type { Entity } from "roc-db"
import type { ValdresWriteTransaction } from "../types/ValdresWriteTransaction"

export const commitUpdate = (
    txn: ValdresWriteTransaction,
    document: Entity,
) => {
    const { ref } = document
    const { entityAtom } = txn.engineOpts
    txn.engineOpts.txn.set(entityAtom(ref), document)
}
