import type { Ref, Transaction } from "roc-db"

export const readEntity = (txn: Transaction, ref: Ref) =>
    txn.engineOpts.entities.get(ref)
