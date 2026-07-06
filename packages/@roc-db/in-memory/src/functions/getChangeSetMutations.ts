import type { GetChangeSetMutationsFunction, Mutation } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const getChangeSetMutations: GetChangeSetMutationsFunction<
    InMemoryEngine
> = (txn, changeSetRef) => {
    if (!changeSetRef) throw new Error("changeSetRef is required")
    const res: Mutation[] = []
    txn.engineOpts.mutations.forEach(mutation => {
        if (mutation.changeSetRef === changeSetRef) {
            res.push(mutation)
        }
    })
    return res
}
