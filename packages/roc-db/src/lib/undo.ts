import type { MutationRef } from "../types/MutationRef"
import type { WriteTransaction } from "./WriteTransaction"

const undoAsync = async (txn: WriteTransaction, mutationRef: MutationRef) => {
    const mutation = await txn.readMutation(mutationRef)
    addToLog(txn, mutation)
}

const undoSync = (txn: WriteTransaction, mutationRef: MutationRef) => {
    const mutation = txn.readMutation(mutationRef)
    addToLog(txn, mutation)
}
export const undo = (txn: WriteTransaction, mutationRef: MutationRef) => {
    if (txn.adapter.async) {
        return undoAsync(txn, mutationRef)
    } else {
        return undoSync(txn, mutationRef)
    }
}

const addToLog = (txn: WriteTransaction, mutation: any) => {
    mutation.log.forEach(([ref, action, document]: any) => {
        switch (action) {
            case "create": {
                txn.deleteEntity(ref)
                break
            }
            case "update": {
                txn.patchEntity(ref, document)
                break
            }
            case "delete": {
                const { ref, data, children, parents, ancestors } = document
                txn.createEntity(ref, { data, children, parents, ancestors })
                break
            }
            default: {
                throw new Error("Not implemented" + action)
            }
        }
    })
}
