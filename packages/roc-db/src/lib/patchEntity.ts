import { createUniqueConstraintConflictError } from "../errors/createUniqueConstraintConflictError"
import type { Entity } from "../types/Entity"
import type { Ref } from "../types/Ref"
import { deepEqual, deepMergePatchSet, deepPatch } from "../utils/deepPatch"
import { validateAndIndexDocument } from "../utils/validateAndIndexDocument"
import type { WriteTransaction } from "./WriteTransaction"

export const patchEntity = (txn: WriteTransaction, ref: Ref, body: any) => {
    if (txn.adapter.async) {
        return patchEntityAsync(txn, ref, body)
    } else {
        return patchEntitySync(txn, ref, body)
    }
}

const findAddedAndRemovedEntries = (oldArr, newArr) => {
    const removed = newArr?.filter(
        ([k1, v1]) => !oldArr.some(([k2, v2]) => k1 === k2 && v1 === v2),
    )
    const added = oldArr?.filter(
        ([k1, v1]) => !newArr.some(([k2, v2]) => k1 === k2 && v1 === v2),
    )
    return [added, removed]
}

const updateChangeIndexEntries = (changeSet, oldDoc, newDoc) => {
    if (newDoc.__.unique?.length || oldDoc.__.unique?.length) {
        const { ref, entity } = newDoc
        const [added, removed] = findAddedAndRemovedEntries(
            newDoc.__.unique,
            oldDoc.__.unique,
        )
        removed.forEach(([key, value]) => {
            const uniqueKey = `${newDoc.entity}:${key}:${JSON.stringify(value)}`
            changeSet.entitiesUnique.delete(uniqueKey)
        })

        added.forEach(([key, value]) => {
            const uniqueKey = `${newDoc.entity}:${key}:${JSON.stringify(value)}`
            if (changeSet.entitiesUnique.has(uniqueKey))
                throw createUniqueConstraintConflictError(entity)
            changeSet.entitiesUnique.set(uniqueKey, ref)
        })
    }
    if (newDoc.__.index?.length || oldDoc.__.index?.length) {
        const { ref, entity } = newDoc
        const [added, removed] = findAddedAndRemovedEntries(
            newDoc.__.index,
            oldDoc.__.index,
        )
        removed.forEach(([key, value]) => {
            const indexKey = `${entity}:${key}:${JSON.stringify(value)}`
            const arr = changeSet.entitiesIndex.get(indexKey) ?? []
            changeSet.entitiesIndex.set(
                indexKey,
                arr.filter(ref => ref !== ref),
            )
        })

        added.forEach(([key, value]) => {
            const indexKey = `${entity}:${key}:${JSON.stringify(value)}`
            const arr = changeSet.entitiesIndex.get(indexKey) ?? []
            changeSet.entitiesIndex.set(indexKey, [...arr, ref])
        })
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
    const [updatedDocument, reversePatch] = deepPatch(currentEntity, patch)

    const model = txn.adapter.models[updatedDocument.entity]
    const validatedDocument = validateAndIndexDocument(model, updatedDocument)
    const existingDocument = txn.readEntity(ref)
    updateChangeIndexEntries(
        txn.changeSet,
        validateAndIndexDocument(model, existingDocument),
        validatedDocument,
    )

    txn.changeSet.entities.set(ref, updatedDocument)
    if (txn.changeSetInitialized) {
        if (txn.log.has(ref)) {
            const [prevAction] = txn.log.get(ref)
            if (prevAction === "create") {
                txn.log.set(ref, ["create", validatedDocument])
            } else if (prevAction === "delete") {
                throw new Error("Cannot update a deleted entity")
            } else if (prevAction === "update") {
                const [, , , prevPatch, { __, ...original }] = txn.log.get(ref)
                const mergedPatch = deepMergePatchSet(prevPatch, patch)
                const [updatedEntity2, reversePatch2] = deepPatch(
                    original,
                    mergedPatch,
                )
                if (!deepEqual(updatedEntity2, updatedDocument)) {
                    throw new Error("Patch failed")
                }
                txn.log.set(ref, [
                    "update",
                    { ...updatedEntity2, __: validatedDocument.__ },
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
                validatedDocument,
                reversePatch,
                patch,
                currentEntity,
            ])
        }
    }
    return updatedDocument
}

const patchEntityAsync = async (txn: WriteTransaction, ref: Ref, body: any) => {
    const currentEntity = await txn.readEntity(ref)
    return handlePatch(txn, ref, currentEntity, body)
}
const patchEntitySync = (txn: WriteTransaction, ref: Ref, body: any) => {
    const currentEntity = txn.readEntity(ref)
    return handlePatch(txn, ref, currentEntity, body)
}
