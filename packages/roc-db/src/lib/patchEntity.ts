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
        let action = "update"
        if (txn.log.has(ref)) {
            if (txn.log.get(ref)[0] === "create") {
                action = "create"
            }
        }
        txn.log.set(ref, [action, updatedEntity, reversePatch])
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
