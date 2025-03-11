import { NotFoundError } from "roc-db"
import { readEntity } from "./readEntity"

export const updateEntity = (
    txn,
    ref,
    { data = {}, children = {}, parents = {}, ancestors = {} },
) => {
    const currentEntity = readEntity(txn, ref)
    if (!currentEntity) throw new NotFoundError(ref)
    const document = {
        ...currentEntity,
        updated: {
            mutationRef: txn.mutation.ref,
            timestamp: txn.mutation.timestamp,
        },
        data,
        children,
        parents,
        ancestors,
    }
    if (txn.request.changeSetRef) {
        throw new Error("TODO support changeSetRef")
    } else {
        txn.engineOpts.entities.set(ref, document)
        return document
    }
}
