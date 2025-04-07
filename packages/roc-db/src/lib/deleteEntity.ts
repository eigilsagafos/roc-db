import type { Ref } from "../types/Ref"
import { DELETED_IN_CHANGE_SET_SYMBOL } from "../utils/DELETED_IN_CHANGE_SET_SYMBOL"
import type { WriteTransaction } from "./WriteTransaction"

export const deleteEntity = (
    txn: WriteTransaction,
    ref: Ref,
    cascade: boolean,
) => {
    if (txn.adapterOpts.async) {
        return deleteEntityAsync(txn, ref, cascade)
    } else {
        return deleteEntitySync(txn, ref, cascade)
    }
}

const applyInLog = (txn: WriteTransaction, ref: Ref, currentDocument) => {
    txn.changeSet.entities.set(ref, DELETED_IN_CHANGE_SET_SYMBOL)
    if (txn.changeSetInitialized) {
        if (txn.log.has(ref)) {
            const event = txn.log.get(ref)
            if (event[0] === "create") {
                txn.log.delete(ref)
            } else if (event[0] === "update") {
                txn.log.set(ref, ["delete", currentDocument])
            } else {
                throw new Error("Unhandled event type")
            }
        } else {
            txn.log.set(ref, ["delete", currentDocument])
        }
    }
}

const deleteEntityAsync = async (
    txn: WriteTransaction,
    ref: Ref,
    cascade: boolean,
) => {
    let refs = [ref]
    if (cascade) {
        const res = await txn.findDependents(ref)
        refs.unshift(...res)
    }

    for (const ref of refs) {
        const currentDocument = await txn.readEntity(ref)
        applyInLog(txn, ref, currentDocument)
    }
    return refs.length
}

const deleteEntitySync = (
    txn: WriteTransaction,
    ref: Ref,
    cascade: boolean,
) => {
    let refs = [ref]
    if (cascade) {
        const res = txn.findDependents(ref) as Ref[]
        refs.unshift(...res)
    }

    for (const ref of refs) {
        const currentDocument = txn.readEntity(ref)
        applyInLog(txn, ref, currentDocument)
    }

    return refs.length
}
