import {
    createUniqueConstraintConflictError,
    entityFromRef,
    type CommitFunction,
    type Ref,
} from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"
import { saveMutation } from "./saveMutation"

const findAddedAndRemovedEntries = (
    oldArr: [string, any][],
    newArr: [string, any][],
) => {
    const removed = newArr?.filter(
        ([k1, v1]) => !oldArr.some(([k2, v2]) => k1 === k2 && v1 === v2),
    )
    const added = oldArr?.filter(
        ([k1, v1]) => !newArr.some(([k2, v2]) => k1 === k2 && v1 === v2),
    )
    return [added, removed]
}

export const commit: CommitFunction<ValdresEngine> = (
    txn,
    mutation,
    { created, updated, deleted },
) => {
    const {
        mutationAtom,
        entityAtom,
        entityUniqueAtom,
        entityIndexAtom,
        txn: valdresTxn,
        rootTxn,
    } = txn.engineOpts as ValdresTxnEngine
    const atom = mutationAtom(txn.mutation.ref)
    const currentMutation = rootTxn.get(atom)
    if (currentMutation) {
        if (
            currentMutation &&
            (mutation as { appliedAt?: unknown }).appliedAt === txn.timestamp
        ) {
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

    for (const doc of created) {
        if (
            txn.adapter.models?.[doc.entity]?.singleton &&
            valdresTxn.get(entityAtom(doc.ref))
        ) {
            throw createUniqueConstraintConflictError(doc.entity)
        }
        if (doc.__.unique?.length) {
            doc.__.unique.forEach(([key, value]: [string, any]) => {
                const atom = entityUniqueAtom(doc.entity, key, value)
                if (valdresTxn.get(atom))
                    throw createUniqueConstraintConflictError(doc.entity)
                valdresTxn.set(atom, doc.ref)
            })
        }
        if (doc.__.index?.length) {
            doc.__.index.forEach(([key, value]: [string, any]) => {
                const atom = entityIndexAtom(doc.entity, key, value)
                valdresTxn.set(atom, (curr: Ref[]) => [...curr, doc.ref])
            })
        }
        valdresTxn.set(entityAtom(doc.ref), doc)
    }
    for (const updatedDocument of updated) {
        const existingDocument: any = valdresTxn.get(
            entityAtom(updatedDocument.ref),
        )
        if (
            updatedDocument.__.unique?.length ||
            existingDocument?.__.unique?.length
        ) {
            const { ref, entity } = updatedDocument
            const [added, removed] = findAddedAndRemovedEntries(
                updatedDocument.__.unique,
                existingDocument.__.unique,
            )
            removed.forEach(([k, v]: [string, any]) => {
                const atom = entityUniqueAtom(entity, k, v)
                valdresTxn.del(atom)
            })

            added.forEach(([k, v]: [string, any]) => {
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
            existingDocument?.__.index?.length
        ) {
            const { ref, entity } = updatedDocument
            const [added, removed] = findAddedAndRemovedEntries(
                updatedDocument.__.index,
                existingDocument.__.index,
            )
            removed.forEach(([k, v]: [string, any]) => {
                const atom = entityIndexAtom(entity, k, v)
                valdresTxn.set(atom, (curr: Ref[]) =>
                    curr.filter((r: Ref) => r !== ref),
                )
            })

            added.forEach(([k, v]: [string, any]) => {
                const atom = entityIndexAtom(entity, k, v)
                valdresTxn.set(atom, (curr: Ref[]) => [...curr, ref])
            })
        }
        valdresTxn.set(entityAtom(updatedDocument.ref), updatedDocument)
    }
    for (const ref of deleted) {
        const entity = entityFromRef(ref)
        if (entity === "Mutation") {
            valdresTxn.del(mutationAtom(ref))
        } else {
            const existingDocument: any = valdresTxn.get(entityAtom(ref))
            if (existingDocument.__.unique?.length) {
                existingDocument.__.unique.forEach(([k, v]: [string, any]) => {
                    const atom = entityUniqueAtom(existingDocument.entity, k, v)
                    valdresTxn.del(atom)
                })
            }
            if (existingDocument.__.index?.length) {
                existingDocument.__.index.forEach(([k, v]: [string, any]) => {
                    const atom = entityIndexAtom(existingDocument.entity, k, v)
                    valdresTxn.set(atom, (curr: Ref[]) =>
                        curr.filter((r: Ref) => r !== existingDocument.ref),
                    )
                })
            }
            valdresTxn.del(entityAtom(ref))
        }
    }
    return mutation
}
