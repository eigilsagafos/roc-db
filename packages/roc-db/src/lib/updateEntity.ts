import type { Ref } from "../types/Ref"
import type { WriteTransaction } from "./WriteTransaction"

export const updateEntity = (txn: WriteTransaction, ref: Ref, body: any) => {
    throw new Error("Not Implemented")
    if (txn.adapter.async) {
        return updateEntityAsync(txn, ref, body)
    } else {
        return updateEntitySync(txn, ref, body)
    }
}

const updateEntitySync = (txn: WriteTransaction, ref: Ref, body: any) => {
    const currentDoc = txn.readEntity(ref)
    throw new Error("TOOO")
    // return updateEntity(txn, ref, currentDoc, updateBody)
}
const updateEntityAsync = async (
    txn: WriteTransaction,
    ref: Ref,
    updateBody: any,
) => {
    const currentDoc = await txn.readEntity(ref)
    const [updatedEntity, reversePatch] = patch(txn, currentEntity, patchSet)
    txn.changeSet.entities.set(ref, updatedEntity)
    if (txn.changeSetInitialized) {
        if (txn.log.has(ref)) throw new Error("TODO")
        txn.log.set(ref, ["update", updatedEntity, reversePatch])
    }
    return updatedEntity
    throw new Error("TOOO")
    // return updateEntity(txn, ref, currentDoc, updateBody)
}
