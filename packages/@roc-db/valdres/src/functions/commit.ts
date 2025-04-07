import { commitCreate } from "./commitCreate"
import { commitDelete } from "./commitDelete"
import { commitUpdate } from "./commitUpdate"
import { saveMutation } from "./saveMutation"

export const commit = (txn, mutation, { created, updated, deleted }) => {
    const { mutationAtom, mutationListAtom } = txn.engineOpts
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

    for (const doc of created) {
        commitCreate(txn, doc)
    }
    for (const doc of updated) {
        commitUpdate(txn, doc)
    }
    for (const ref of deleted) {
        commitDelete(txn, ref)
    }
    return mutation
}
