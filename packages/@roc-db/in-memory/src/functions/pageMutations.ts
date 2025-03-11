import type { ReadTransaction } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const pageMutations = (
    txn: ReadTransaction<any, InMemoryEngine, any, any>,
    { size = 30, skip = 0 }: { size?: number; skip?: number } = {},
) => {
    return txn.engineOpts.mutations.values().drop(skip).take(size).toArray()
}
