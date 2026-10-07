import { filterAndPageMutations, normalizePageMutationsArgs } from "roc-db"
import type { PageMutationsFunction } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const pageMutations: PageMutationsFunction<InMemoryEngine> = (
    txn,
    args,
) =>
    filterAndPageMutations(
        txn.engineOpts.mutations.values(),
        normalizePageMutationsArgs(args),
    )
