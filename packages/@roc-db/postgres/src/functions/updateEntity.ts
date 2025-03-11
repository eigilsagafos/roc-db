import type { Ref } from "roc-db"
import type { PostgresMutationTransaction } from "../types/PostgresMutationTransaction"
import { readEntity } from "./readEntity"

export const updateEntity = async (
    txn: PostgresMutationTransaction,
    ref: Ref,
    {
        data = {},
        indexedData = {},
        parents = {},
        children = {},
        ancestors = {},
    },
) => {
    const existingDoc = await readEntity(txn, ref)
    const updatedDoc = {
        ...existingDoc,
        updated: {
            timestamp: txn.mutation.timestamp,
            mutationRef: txn.mutation.ref,
        },
        data: { ...data, ...indexedData },
        children,
        parents,
        ancestors,
    }

    if (txn.request.changeSetRef) {
        throw new Error("TODO changeSetRef")
    }

    if (txn.engineOpts.uncommitted[ref]) {
        txn.engineOpts.uncommitted[ref][1] = existingDoc
    } else {
        txn.engineOpts.uncommitted[ref] = ["update", existingDoc]
    }

    return updatedDoc
}
