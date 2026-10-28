import type { AdapterFunctions } from "../types/AdapterFunctions"

const REQUIRED_FUNCTIONS = [
    "commit",
    "findRecentMutations",
    "getChangeSetMutations",
    "pageEntities",
    "pageEntitiesByIndex",
    "pageMutations",
    "readEntity",
    "readMutation",
    "refByUniqueField",
    "saveMutation",
] as const satisfies readonly (keyof AdapterFunctions)[]

// An adapter package released for another roc-db can be installed next to
// this one. Fail when the adapter is created rather than on the first write
// that needs a function it lacks.
export const assertAdapterFunctions = (
    adapterName: string,
    functions: AdapterFunctions,
) => {
    const missing = REQUIRED_FUNCTIONS.filter(
        name => typeof functions?.[name] !== "function",
    )
    if (missing.length) {
        throw new Error(
            `The ${adapterName} adapter does not implement ${missing.join(", ")}, so it was built for a different version of roc-db. Install matching versions of roc-db and its adapters.`,
        )
    }
}
