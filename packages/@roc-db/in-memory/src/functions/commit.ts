import {
    createUniqueConstraintConflictError,
    type Entity,
    type Mutation,
    type Ref,
    type WriteTransaction,
} from "roc-db"
import { saveMutation } from "./saveMutation"

const findAddedAndRemovedEntries = (oldArr, newArr) => {
    const removed = newArr?.filter(
        ([k1, v1]) => !oldArr.some(([k2, v2]) => k1 === k2 && v1 === v2),
    )
    const added = oldArr?.filter(
        ([k1, v1]) => !newArr.some(([k2, v2]) => k1 === k2 && v1 === v2),
    )
    return [added, removed]
}

export const commit = (
    txn: WriteTransaction,
    mutation: Mutation,
    {
        created,
        updated,
        deleted,
    }: { created: Entity[]; updated: Entity[]; deleted: Ref[] },
) => {
    const { mutations } = txn.engineOpts
    const currentMutation = mutations.get(txn.mutation.ref)
    if (currentMutation) {
        if (currentMutation && mutation.appliedAt === txn.timestamp) {
            saveMutation(txn, mutation)
        } else if (
            currentMutation &&
            mutation.debounceCount > currentMutation.debounceCount
        ) {
            saveMutation(txn, mutation)
        } else {
            throw new Error("Mutation already exists")
        }
    } else {
        saveMutation(txn, mutation)
    }

    if (txn.request.changeSetRef) return mutation

    for (const doc of created) {
        if (doc.__.unique?.length) {
            doc.__.unique.forEach(([key, value]) => {
                const uniqueKey = `${doc.entity}:${key}:${JSON.stringify(value)}`
                if (txn.engineOpts.entitiesUnique.has(uniqueKey))
                    throw createUniqueConstraintConflictError(doc.entity)
                txn.engineOpts.entitiesUnique.set(uniqueKey, doc.ref)
            })
        }
        if (doc.__.index?.length) {
            doc.__.index.forEach(([key, value]) => {
                const indexKey = `${doc.entity}:${key}:${JSON.stringify(value)}`
                const arr = txn.engineOpts.entitiesIndex.get(indexKey) ?? []
                txn.engineOpts.entitiesIndex.set(indexKey, [...arr, doc.ref])
            })
        }
        txn.engineOpts.entities.set(doc.ref, doc)
    }
    for (const updatedDocument of updated) {
        const existingDocument = txn.engineOpts.entities.get(
            updatedDocument.ref,
        )
        if (
            updatedDocument.__.unique?.length ||
            existingDocument.__.unique?.length
        ) {
            const { ref, entity } = updatedDocument
            const [added, removed] = findAddedAndRemovedEntries(
                updatedDocument.__.unique,
                existingDocument.__.unique,
            )
            removed.forEach(([key, value]) => {
                const uniqueKey = `${updatedDocument.entity}:${key}:${JSON.stringify(value)}`
                txn.engineOpts.entitiesUnique.delete(uniqueKey)
            })

            added.forEach(([key, value]) => {
                const uniqueKey = `${updatedDocument.entity}:${key}:${JSON.stringify(value)}`
                if (txn.engineOpts.entitiesUnique.has(uniqueKey))
                    throw createUniqueConstraintConflictError(entity)
                txn.engineOpts.entitiesUnique.set(uniqueKey, ref)
            })
        }
        if (
            updatedDocument.__.index?.length ||
            existingDocument.__.index?.length
        ) {
            const { ref, entity } = updatedDocument
            const [added, removed] = findAddedAndRemovedEntries(
                updatedDocument.__.index,
                existingDocument.__.index,
            )
            removed.forEach(([key, value]) => {
                const indexKey = `${updatedDocument.entity}:${key}:${JSON.stringify(value)}`
                const arr = txn.engineOpts.entitiesIndex.get(indexKey)
                txn.engineOpts.entitiesIndex.set(
                    indexKey,
                    arr.filter(ref => ref !== updatedDocument.ref),
                )
            })

            added.forEach(([key, value]) => {
                const indexKey = `${updatedDocument.entity}:${key}:${JSON.stringify(value)}`
                const arr = txn.engineOpts.entitiesIndex.get(indexKey) ?? []
                txn.engineOpts.entitiesIndex.set(indexKey, [
                    ...arr,
                    updatedDocument.ref,
                ])
            })
        }

        txn.engineOpts.entities.set(updatedDocument.ref, updatedDocument)
    }
    for (const ref of deleted) {
        if (ref.startsWith("Mutation/")) {
            txn.engineOpts.mutations.delete(ref)
        } else {
            const existingDocument = txn.engineOpts.entities.get(ref)
            if (existingDocument.__.unique?.length) {
                existingDocument.__.unique.forEach(([key, value]) => {
                    const uniqueKey = `${existingDocument.entity}:${key}:${JSON.stringify(value)}`
                    txn.engineOpts.entitiesUnique.delete(uniqueKey)
                })
            }
            if (existingDocument.__.index?.length) {
                existingDocument.__.index.forEach(([key, value]) => {
                    const indexKey = `${existingDocument.entity}:${key}:${JSON.stringify(value)}`
                    const arr = txn.engineOpts.entitiesIndex.get(indexKey) ?? []
                    txn.engineOpts.entitiesIndex.set(
                        indexKey,
                        arr.filter(ref => ref !== existingDocument.ref),
                    )
                })
            }
            txn.engineOpts.entities.delete(ref)
        }
    }

    return mutation
}
