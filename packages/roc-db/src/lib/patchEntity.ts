import type { Entity } from "../types/Entity"
import type { Ref } from "../types/Ref"
import { deepEqual, deepMergePatchSet, deepPatch } from "../utils/deepPatch"
import type { WriteTransaction } from "./WriteTransaction"

export const patchEntity = (txn: WriteTransaction, ref: Ref, body: any) => {
    if (txn.adapter.async) {
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
    const patch = {
        updated: {
            mutationRef: txn.mutation.ref,
            timestamp: txn.mutation.timestamp,
        },
        ...patchSet,
    }
    const [updatedEntity, reversePatch] = deepPatch(currentEntity, patch)

    txn.changeSet.entities.set(ref, updatedEntity)
    if (txn.changeSetInitialized) {
        if (txn.log.has(ref)) {
            const [prevAction] = txn.log.get(ref)
            if (prevAction === "create") {
                txn.log.set(ref, ["create", updatedEntity])
            } else if (prevAction === "delete") {
                throw new Error("Cannot update a deleted entity")
            } else if (prevAction === "update") {
                const [, , , prevPatch, original] = txn.log.get(ref)
                const mergedPatch = deepMergePatchSet(prevPatch, patch)
                const [updatedEntity2, reversePatch2] = deepPatch(
                    original,
                    mergedPatch,
                )
                if (!deepEqual(updatedEntity2, updatedEntity)) {
                    throw new Error("Patch failed")
                }
                txn.log.set(ref, [
                    "update",
                    updatedEntity2,
                    reversePatch2,
                    mergedPatch,
                    original,
                ])
            } else {
                throw new Error("Unhandled action")
            }
        } else {
            txn.log.set(ref, [
                "update",
                updatedEntity,
                reversePatch,
                patch,
                currentEntity,
            ])
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
