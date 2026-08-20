import { filterAndPageMutations, normalizePageMutationsArgs } from "roc-db"
import type { PageMutationsFunction } from "roc-db"
import { readAllMutations } from "../lib/readAllMutations"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const pageMutations: PageMutationsFunction<ValdresEngine> = (
    txn,
    args,
) =>
    filterAndPageMutations(
        readAllMutations(txn.engineOpts as ValdresTxnEngine),
        normalizePageMutationsArgs(args),
    )
