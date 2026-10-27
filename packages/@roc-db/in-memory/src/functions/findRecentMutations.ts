import type { FindRecentMutationsFunction } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const findRecentMutations: FindRecentMutationsFunction<
    InMemoryEngine
> = (engine, { changeSetRef, identityRef, since }) =>
    engine.mutations
        .values()
        .filter(
            mutation =>
                (mutation.timestamp > since ||
                    (!!mutation.persistedAt && mutation.persistedAt > since)) &&
                ((mutation.changeSetRef ?? null) === changeSetRef ||
                    mutation.identityRef === identityRef),
        )
        .toArray()
