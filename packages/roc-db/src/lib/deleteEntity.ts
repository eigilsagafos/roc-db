import type { Ref } from "../types/Ref"
import { DELETED_IN_CHANGE_SET_SYMBOL } from "../utils/DELETED_IN_CHANGE_SET_SYMBOL"
import { validateAndIndexDocument } from "../utils/validateAndIndexDocument"
import type { WriteTransaction } from "./WriteTransaction"

export const deleteEntity = (
    txn: WriteTransaction,
    ref: Ref,
    cascade: boolean,
) => {
    if (txn.adapter.async) {
        return deleteEntityAsync(txn, ref, cascade)
    } else {
        return deleteEntitySync(txn, ref, cascade)
    }
}

const removeIndexEntriesFromMap = (document, indexMap) => {
    for (const [key, value] of document.__.index) {
        const entry = `${document.entity}:${key}:${JSON.stringify(value)}`
        const arr = (indexMap.get(entry) || []).filter(
            ref => ref !== document.ref,
        )
        indexMap.set(entry, arr)
    }
}
const removeUniqueEntriesFromMap = (document, uniqueMap) => {
    for (const [key, value] of document.__.unique) {
        const entry = `${document.entity}:${key}:${JSON.stringify(value)}`
        console.log("removing unique entry", entry)
        uniqueMap.set(entry, DELETED_IN_CHANGE_SET_SYMBOL)
    }
}

const applyInLog = (txn: WriteTransaction, ref: Ref, currentDocument) => {
    txn.changeSet.entities.set(ref, DELETED_IN_CHANGE_SET_SYMBOL)
    const model = txn.adapter.models[currentDocument.entity]
    const validated = validateAndIndexDocument(model, currentDocument)
    if (validated.__.index?.length) {
        removeIndexEntriesFromMap(validated, txn.changeSet.entitiesIndex)
    }
    if (validated.__.unique?.length > 0) {
        removeUniqueEntriesFromMap(validated, txn.changeSet.entitiesUnique)
    }
    if (txn.changeSet.initialized) {
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
