import { entityFromRef, type Ref } from "roc-db"
import type { PostgresMutationTransaction } from "../types/PostgresMutationTransaction"

export const createEntity = async (
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
    const entity = entityFromRef(ref)

    const document = {
        ref,
        entity: entity,
        created: {
            timestamp: txn.mutation.timestamp,
            mutationRef: txn.mutation.ref,
        },
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

    if (txn.request.changeSetRef) {
        txn.engineOpts.changeSet.entities.set(ref, document)
    } else {
        txn.engineOpts.uncommitted[ref] = ["create", document]
    }
    return document
}
