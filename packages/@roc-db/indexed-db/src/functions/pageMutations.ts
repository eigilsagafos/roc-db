import { filterAndPageMutations, normalizePageMutationsArgs } from "roc-db"
import type { PageMutationsFunction } from "roc-db"
import { readAllMutations } from "../lib/readAllMutations"
import type { IndexedDBTxnEngine } from "../types/IndexedDBEngine"
import type { IndexedDBReadTransaction } from "../types/IndexedDBReadTransaction"

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous alias return directly. Params are typed manually and the value is
// cast to the alias for the AdapterFunctions check.
export const pageMutations: PageMutationsFunction = (async (
    txn: IndexedDBReadTransaction,
    args: any,
) => {
    const normalized = normalizePageMutationsArgs(args)
    const mutations = await readAllMutations(
        txn.engineOpts as IndexedDBTxnEngine,
    )
    return filterAndPageMutations(mutations, normalized)
}) as unknown as PageMutationsFunction
