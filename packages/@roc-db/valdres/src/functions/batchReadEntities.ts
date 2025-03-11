import type { Ref } from "roc-db"
import { readEntity } from "./readEntity"

export const batchReadEntities = (txn, refs: Ref[]) => {
    return refs.map(ref => readEntity(txn, ref))
}
