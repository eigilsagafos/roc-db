import type { FindRecentMutationsFunction, Mutation } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const findRecentMutations: FindRecentMutationsFunction<
    InMemoryEngine
> = (
    engine,
    { changeSetRef, identityRef, since, scopeMutations, identityMutations },
) => {
    const afterSince = (mutation: Mutation) =>
        mutation.timestamp > since ||
        (!!mutation.persistedAt && mutation.persistedAt > since)
    return engine.mutations
        .values()
        .filter(mutation => {
            const scope = mutation.changeSetRef ?? null
            if (
                scopeMutations !== false &&
                scope === changeSetRef &&
                afterSince(mutation)
            ) {
                return true
            }
            if (mutation.identityRef !== identityRef) return false
            if (identityMutations === undefined) return afterSince(mutation)
            if (identityMutations === "none") return false
            return mutation.timestamp > since
        })
        .toArray()
}
