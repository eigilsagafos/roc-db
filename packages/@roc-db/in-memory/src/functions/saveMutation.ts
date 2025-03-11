import type { InMemoryWriteTransaction } from "../types/InMemoryWriteTransaction"

export const saveMutation = (
    txn: InMemoryWriteTransaction,
    finalizedMutation,
) => {
    txn.engineOpts.mutations.set(finalizedMutation.ref, finalizedMutation)
    return finalizedMutation
}
