import type { SaveMutationFunction } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const saveMutation: SaveMutationFunction<InMemoryEngine> = (
    txn,
    finalizedMutation,
) => {
    txn.engineOpts.mutations.set(finalizedMutation.ref, finalizedMutation)
    return finalizedMutation
}
