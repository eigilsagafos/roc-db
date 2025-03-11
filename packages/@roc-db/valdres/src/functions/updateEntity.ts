import { NotFoundError, type Ref } from "roc-db"
import type { ValdresWriteTranscation } from "../types/ValdresWriteTransaction"
import { readEntity } from "./readEntity"

export const updateEntity = (
    txn: ValdresWriteTranscation,
    ref: Ref,
    {
        data = {},
        indexedData = {},
        children = {},
        parents = {},
        ancestors = {},
    },
) => {
    const existingEntity = readEntity(txn, ref)
    if (!existingEntity) throw new NotFoundError(ref)
    const updatedEntity = {
        ...existingEntity,
        updated: {
            timestamp: txn.mutation.timestamp,
            mutationRef: txn.mutation.ref,
        },
        data: {
            ...data,
            ...indexedData,
        },
        children,
        parents,
        ancestors,
    }
    const { entityAtom } = txn.engineOpts
    txn.engineOpts.txn.set(entityAtom(ref), updatedEntity)
    return updatedEntity
}
