import type { Mutation, ReadMutationFunction } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const readMutation: ReadMutationFunction<InMemoryEngine> = (
    engineOpts,
    ref,
) => {
    // `engineOpts` is the untyped first arg of the contract (txn OR engine
    // opts, depending on adapter); in-memory always receives the engine opts.
    return (engineOpts as InMemoryEngine).mutations.get(ref) as Mutation | null
}
