import type { Ref, Transaction } from "roc-db"
import type { PostgresEngineOpts } from "../types/PostgresEngineOpts"
import { readEntity } from "./readEntity"

export const batchReadEntities = (
    txn: Transaction<PostgresEngineOpts>,
    refs: Ref[],
) => {
    return Promise.all(refs.map(ref => readEntity(txn, ref)))
}
