import { computeMutationFacets, normalizeMutationFacetsArgs } from "roc-db"
import type { MutationFacetsFunction } from "roc-db"
import { readAllMutations } from "../lib/readAllMutations"
import type { IndexedDBTxnEngine } from "../types/IndexedDBEngine"
import type { IndexedDBReadTransaction } from "../types/IndexedDBReadTransaction"

export const mutationFacets: MutationFacetsFunction = (async (
    txn: IndexedDBReadTransaction,
    args: any,
) => {
    const normalized = normalizeMutationFacetsArgs(args)
    const mutations = await readAllMutations(
        txn.engineOpts as IndexedDBTxnEngine,
    )
    return computeMutationFacets(mutations, normalized)
}) as unknown as MutationFacetsFunction
