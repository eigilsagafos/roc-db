import { saveMutation } from "./saveMutation"

export const commit = (txn, mutation, { created, updated, deleted }) => {
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
        txn.engineOpts.entities.set(doc.ref, doc)
    }
    for (const doc of updated) {
        txn.engineOpts.entities.set(doc.ref, doc)
    }
    for (const ref of deleted) {
        txn.engineOpts.entities.delete(ref)
    }

    return mutation
}
