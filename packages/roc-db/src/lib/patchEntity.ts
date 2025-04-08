import type { Entity } from "../types/Entity"
import type { Ref } from "../types/Ref"
import { deepPatch } from "../utils/deepPatch"
import type { WriteTransaction } from "./WriteTransaction"

export const patchEntity = (txn: WriteTransaction, ref: Ref, body: any) => {
    if (txn.adapterOpts.async) {
        return patchEntityAsync(txn, ref, body)
    } else {
        return patchEntitySync(txn, ref, body)
    }
}

const handlePatch = (
    txn: WriteTransaction,
    ref: Ref,
    currentEntity: Entity,
    patchSet: any,
) => {
    const [updatedEntity, reversePatch] = deepPatch(currentEntity, {
        updated: {
            mutationRef: txn.mutation.ref,
            timestamp: txn.mutation.timestamp,
        },
        ...patchSet,
    })

    txn.changeSet.entities.set(ref, updatedEntity)
    if (txn.changeSetInitialized) {
        if (txn.log.has(ref)) {
            const [prevAction] = txn.log.get(ref)
            if (prevAction === "create") {
                txn.log.set(ref, ["create", updatedEntity])
            } else if (prevAction === "delete") {
                throw new Error("Cannot update a deleted entity")
            } else if (prevAction === "update") {
                const [, prevUpdated, prevRevPatch] = txn.log.get(ref)
                const [restored] = deepPatch(prevUpdated, prevRevPatch)
                const [newUpdated, newRevPatch] = deepPatch(restored, {
                    updated: {
                        mutationRef: txn.mutation.ref,
                        timestamp: txn.mutation.timestamp,
                    },
                    ...patchSet,
                })
                txn.log.set(ref, ["update", newUpdated, newRevPatch])
            }
        } else {
            txn.log.set(ref, ["update", updatedEntity, reversePatch])
        }
    }
    return updatedEntity
}

const patchEntityAsync = async (txn: WriteTransaction, ref: Ref, body: any) => {
    const currentEntity = await txn.readEntity(ref)
    return handlePatch(txn, ref, currentEntity, body)
}
const patchEntitySync = (txn: WriteTransaction, ref: Ref, body: any) => {
    const currentEntity = txn.readEntity(ref)
    return handlePatch(txn, ref, currentEntity, body)
}
