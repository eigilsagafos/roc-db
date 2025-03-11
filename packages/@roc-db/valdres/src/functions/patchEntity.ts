import { deepPatch, NotFoundError, type Ref } from "roc-db"
import { readEntity } from "./readEntity"
import type { ValdresWriteTranscation } from "../types/ValdresWriteTransaction"

export const patchEntity = (
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
    if (!ref) throw new Error("ref is required")
    const existingEntity = readEntity(txn, ref)
    if (!existingEntity) throw new NotFoundError(ref)
    const combinedData = { ...data, ...indexedData }
    const updatedEntity = {
        ...existingEntity,
        updated: {
            timestamp: txn.mutation.timestamp,
            mutationRef: txn.mutation.ref,
        },
        data: deepPatch(existingEntity.data, combinedData),
        children: deepPatch(existingEntity.children, children),
        parents: deepPatch(existingEntity.parents, parents),
        ancestors: deepPatch(existingEntity.ancestors, ancestors),
    }
    const { entityAtom } = txn.engineOpts
    txn.engineOpts.txn.set(entityAtom(ref), updatedEntity)
    return updatedEntity
}
