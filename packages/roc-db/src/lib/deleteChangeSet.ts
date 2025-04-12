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
    if (txn.changeSetInitialized) {
        // throw new Error("TODO - Should not happen")
        if (txn.log.has(ref)) {
            throw new Error("TODO")
            const event = txn.log.get(ref)
            if (event[0] === "create") {
                txn.log.delete(ref)
            } else if (event[0] === "update") {
                txn.log.set(ref, ["delete", currentDocument])
            } else {
                throw new Error("Unhandled event type")
            }
        } else {
            txn.log.set(ref, ["delete"])
        }
    }
}
