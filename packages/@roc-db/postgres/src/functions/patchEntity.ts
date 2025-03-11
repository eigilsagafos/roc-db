import { deepPatch, NotFoundError, type Ref } from "roc-db"
import type { PostgresMutationTransaction } from "../types/PostgresMutationTransaction"
import { readEntity } from "./readEntity"

export const patchEntity = async (
    txn: PostgresMutationTransaction,
    ref: Ref,
    {
        data = {},
        indexedData = {},
        children = {},
        parents = {},
        ancestors = {},
    },
) => {
    const existingDoc = await readEntity(txn, ref)
    if (!existingDoc) throw new NotFoundError(ref)
    const updatedDocument = {
        ...existingDoc,
        updated: {
            timestamp: txn.mutation.timestamp,
            mutationRef: txn.mutation.ref,
        },
        data: deepPatch(existingDoc.data, { ...data, ...indexedData }),
        children: deepPatch(existingDoc.children, children),
        parents: deepPatch(existingDoc.parents, parents),
        ancestors: deepPatch(existingDoc.ancestors, ancestors),
    }

    if (txn.request.changeSetRef) {
        txn.engineOpts.changeSet.entities.set(ref, updatedDocument)
    } else {
        if (txn.engineOpts.uncommitted[ref]) {
            txn.engineOpts.uncommitted[ref][1] = updatedDocument
        } else {
            txn.engineOpts.uncommitted[ref] = ["update", updatedDocument]
        }
    }

    return updatedDocument
}
