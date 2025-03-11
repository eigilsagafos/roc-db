import { entityFromRef, type Ref } from "roc-db"
import type { ValdresWriteTransaction } from "../types/ValdresWriteTransaction"

export const createEntity = (
    txn: ValdresWriteTransaction,
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
    const { entityAtom, entityRefListAtom } = txn.engineOpts
    if (txn.engineOpts.txn.get(entityAtom(ref))) {
        throw new Error(`Entity ${ref} already exists`)
    }
    txn.engineOpts.txn.set(entityAtom(ref), document)
    if (entityRefListAtom) {
        txn.engineOpts.txn.set(entityRefListAtom(entity), curr => [
            ...curr,
            ref,
        ])
    }
    return document
}
