import { computeMutationFacets, normalizeMutationFacetsArgs } from "roc-db"
import type { MutationFacetsFunction } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const mutationFacets: MutationFacetsFunction<InMemoryEngine> = (
    txn,
    args,
) =>
    computeMutationFacets(
        txn.engineOpts.mutations.values(),
        normalizeMutationFacetsArgs(args),
    )
