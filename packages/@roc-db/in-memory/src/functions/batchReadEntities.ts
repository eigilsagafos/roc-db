import type { Ref, Transaction } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"
import { readEntity } from "./readEntity"

export const batchReadEntities = (
    txn: Transaction<InMemoryEngine>,
    refs: Ref[],
) => {
    return refs.map(ref => readEntity(txn, ref))
}
