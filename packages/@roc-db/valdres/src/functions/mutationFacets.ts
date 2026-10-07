import { computeMutationFacets, normalizeMutationFacetsArgs } from "roc-db"
import type { MutationFacetsFunction } from "roc-db"
import { readAllMutations } from "../lib/readAllMutations"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const mutationFacets: MutationFacetsFunction<ValdresEngine> = (
    txn,
    args,
) =>
    computeMutationFacets(
        readAllMutations(txn.engineOpts as ValdresTxnEngine),
        normalizeMutationFacetsArgs(args),
    )
