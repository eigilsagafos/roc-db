import type { Ref } from "../types/Ref"
import { DELETED_IN_CHANGE_SET_SYMBOL } from "../utils/DELETED_IN_CHANGE_SET_SYMBOL"
import type { WriteTransaction } from "./WriteTransaction"

export const deleteChangeSet = (txn: WriteTransaction, ref: Ref) => {
    if (txn.adapter.async) {
        return deleteChangeSetAsync(txn, ref)
    } else {
        return deleteChangeSetSync(txn, ref)
    }
}

const deleteChangeSetAsync = async (txn: WriteTransaction, ref: Ref) => {
    const changeSet = await txn.adapter.functions.getChangeSetMutations(
        txn,
        ref,
    )
    changeSet.forEach(mutation => applyInLog(txn, mutation.ref))
    return changeSet.map(m => m.ref)
}
const deleteChangeSetSync = (txn: WriteTransaction, ref: Ref) => {
    const changeSet = txn.adapter.functions.getChangeSetMutations(txn, ref)
    changeSet.forEach(mutation => applyInLog(txn, mutation.ref))
    return changeSet.length
}

const applyInLog = (txn: WriteTransaction, ref: Ref) => {
    txn.changeSet.mutations.set(ref, DELETED_IN_CHANGE_SET_SYMBOL)
    if (txn.changeSet.initialized) {
        if (txn.log.has(ref)) {
            // TODO: deleting a ref already mutated within an initialized
            // changeSet is not handled yet.
            throw new Error("TODO")
        } else {
            txn.log.set(ref, ["delete"])
        }
    }
}
