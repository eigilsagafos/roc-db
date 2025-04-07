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
        await commitCreate(txn, doc)
    }
    for (const doc of updated) {
        await commitUpdate(txn, doc)
    }
    for (const ref of deleted) {
        await commitDelete(txn, ref)
    }
    return mutation
}
