import {
    createUniqueConstraintConflictError,
    entityFromRef,
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
    const { mutationAtom } = txn.engineOpts
    const atom = mutationAtom(txn.mutation.ref)
    const currentMutation = txn.engineOpts.rootTxn.get(atom)
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

    const {
        entityAtom,
        entityUniqueAtom,
        entityIndexAtom,
        txn: valdresTxn,
    } = txn.engineOpts
    for (const doc of created) {
        if (doc.__.unique?.length) {
            doc.__.unique.forEach(([key, value]) => {
                const atom = entityUniqueAtom(doc.entity, key, value)
                if (valdresTxn.get(atom))
                    throw createUniqueConstraintConflictError(doc.entity)
                valdresTxn.set(atom, doc.ref)
            })
        }
        if (doc.__.index?.length) {
            doc.__.index.forEach(([key, value]) => {
                const atom = entityIndexAtom(doc.entity, key, value)
                valdresTxn.set(atom, curr => [...curr, doc.ref])
            })
        }
        valdresTxn.set(entityAtom(doc.ref), doc)
    }
    for (const updatedDocument of updated) {
        const existingDocument = valdresTxn.get(entityAtom(updatedDocument.ref))
        if (
            updatedDocument.__.unique?.length ||
            existingDocument.__.unique?.length
        ) {
            const { ref, entity } = updatedDocument
            const [added, removed] = findAddedAndRemovedEntries(
                updatedDocument.__.unique,
                existingDocument.__.unique,
            )
            removed.forEach(([k, v]) => {
                const atom = entityUniqueAtom(entity, k, v)
                valdresTxn.del(atom)
            })

            added.forEach(([k, v]) => {
                const atom = entityUniqueAtom(entity, k, v)
                if (valdresTxn.get(atom)) {
                    throw createUniqueConstraintConflictError(entity)
                } else {
                    valdresTxn.set(atom, ref)
                }
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
            removed.forEach(([k, v]) => {
                const atom = entityIndexAtom(entity, k, v)
                valdresTxn.set(atom, curr => curr.filter(r => r !== ref))
            })

            added.forEach(([k, v]) => {
                const atom = entityIndexAtom(entity, k, v)
                valdresTxn.set(atom, curr => [...curr, ref])
            })
        }
        valdresTxn.set(entityAtom(updatedDocument.ref), updatedDocument)
    }
    for (const ref of deleted) {
        const entity = entityFromRef(ref)
        if (entity === "Mutation") {
            txn.engineOpts.txn.del(mutationAtom(ref))
        } else {
            const existingDocument = valdresTxn.get(entityAtom(ref))
            if (existingDocument.__.unique?.length) {
                existingDocument.__.unique.forEach(([k, v]) => {
                    const atom = entityUniqueAtom(existingDocument.entity, k, v)
                    valdresTxn.del(atom)
                })
            }
            if (existingDocument.__.index?.length) {
                existingDocument.__.index.forEach(([k, v]) => {
                    const atom = entityIndexAtom(existingDocument.entity, k, v)
                    valdresTxn.set(atom, curr =>
                        curr.filter(r => r !== existingDocument.ref),
                    )
                })
            }
            txn.engineOpts.txn.del(entityAtom(ref))
        }
    }
    return mutation
}
