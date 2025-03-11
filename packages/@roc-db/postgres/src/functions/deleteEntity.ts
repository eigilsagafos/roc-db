import { DELETED_IN_CHANGE_SET_SYMBOL, type Ref } from "roc-db"
import type { PostgresMutationTransaction } from "../types/PostgresMutationTransaction"
import { readEntity } from "./readEntity"

export const deleteEntity = async (
    txn: PostgresMutationTransaction,
    ref: Ref,
) => {
    const existingDoc = await readEntity(txn, ref)
    if (txn.request.changeSetRef) {
        txn.engineOpts.changeSet.entities.set(ref, DELETED_IN_CHANGE_SET_SYMBOL)
    } else {
        txn.engineOpts.uncommitted[ref] = ["delete", existingDoc]
    }
    return true
}
