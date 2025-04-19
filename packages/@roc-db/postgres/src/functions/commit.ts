import { createUniqueConstraintConflictError } from "roc-db"
import { commitCreate } from "./commitCreate"
import { commitDelete } from "./commitDelete"
import { commitUpdate } from "./commitUpdate"
import { readMutation } from "./readMutation"
import { saveMutation } from "./saveMutation"

export const commit = async (txn, mutation, { created, updated, deleted }) => {
    const currentMutation = await readMutation(txn.engineOpts, mutation.ref)

    if (currentMutation) {
        if (currentMutation && mutation.appliedAt === txn.timestamp) {
            await saveMutation(txn, mutation)
        } else if (
            currentMutation &&
            mutation.debounceCount > currentMutation.debounceCount
        ) {
            await saveMutation(txn, mutation)
        } else {
            throw new Error("Mutation already exists")
        }
    } else {
        await saveMutation(txn, mutation)
    }

    if (txn.request.changeSetRef) return mutation
    for (const doc of created) {
        await commitCreate(txn, doc).catch(err => {
            if (err.code === "23505") {
                const [, entity, constraint] = err.detail.match(
                    /\)=\((.+), (.+)\) already exists/,
                )
                const field = constraint.substring(0, constraint.indexOf(":"))
                const value = JSON.parse(
                    constraint.substring(constraint.indexOf(":") + 1),
                )
                throw createUniqueConstraintConflictError(entity, field, value)
            }
            throw err
        })
    }
    for (const doc of updated) {
        await commitUpdate(txn, doc)
    }
    for (const ref of deleted) {
        await commitDelete(txn, ref)
    }
    return mutation
}
