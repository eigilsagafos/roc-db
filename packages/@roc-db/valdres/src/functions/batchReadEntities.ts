import type { Ref } from "roc-db"
import type { ValdresTransaction } from "../types/ValdresTransaction"
import { readEntity } from "./readEntity"

export const batchReadEntities = (txn: ValdresTransaction, refs: Ref[]) => {
    return refs.map(ref => readEntity(txn, ref))
}
