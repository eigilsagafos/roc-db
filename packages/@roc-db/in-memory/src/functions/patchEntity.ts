import { deepPatch, NotFoundError } from "roc-db"
import { readEntity } from "./readEntity"

export const patchEntity = (
    txn,
    ref,
    { data = {}, children = {}, parents = {}, ancestors = {} },
) => {
    const existingDocument = readEntity(txn, ref)
    if (!existingDocument) throw new NotFoundError(ref)
    const updatedDocument = {
        ...existingDocument,
        updated: {
            timestamp: txn.mutation.timestamp,
            mutationRef: txn.mutation.ref,
        },
        data: deepPatch(existingDocument.data, data),
        children: deepPatch(existingDocument.children, children),
        parents: deepPatch(existingDocument.parents, parents),
        ancestors: deepPatch(existingDocument.ancestors, ancestors),
    }
    if (txn.request.changeSetRef) {
        txn.engineOpts.changeSet.entities.set(ref, updatedDocument)
        return updatedDocument
    } else {
        txn.engineOpts.entities.set(ref, updatedDocument)
        return updatedDocument
    }
}
