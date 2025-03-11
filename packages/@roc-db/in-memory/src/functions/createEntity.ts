import { entityFromRef, type Ref } from "roc-db"
import type { InMemoryWriteTransaction } from "../types/InMemoryWriteTransaction"

export const createEntity = (
    txn: InMemoryWriteTransaction,
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
        entity,
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
        if (txn.engineOpts.changeSet.entities.has(ref)) {
            throw new Error("Entity already exists in changeSet")
        } else {
            txn.engineOpts.changeSet.entities.set(ref, document)
            return document
        }
    } else {
        txn.engineOpts.entities.set(ref, document)
        return document
    }
}
