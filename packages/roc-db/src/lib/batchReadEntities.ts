import type { Ref } from "../types/Ref"
import type { Transaction } from "../types/Transaction"

export const batchReadEntities = (txn: Transaction, refs: Ref[]) => {
    if (txn.adapter.async) {
        return Promise.all(refs.map(ref => txn.readEntity(ref)))
    } else {
        return refs.map(ref => txn.readEntity(ref))
    }
}
