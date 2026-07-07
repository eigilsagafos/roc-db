import type { Ref, Transaction } from "roc-db"
import type { IndexedDBEngine } from "../types/IndexedDBEngine"
import { readEntity } from "./readEntity"

export const batchReadEntities = (
    txn: Transaction<IndexedDBEngine>,
    refs: Ref[],
) => {
    return Promise.all(refs.map(ref => readEntity(txn, ref)))
}
