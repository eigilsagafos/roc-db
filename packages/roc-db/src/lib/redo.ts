import type { MutationRef } from "../types/MutationRef"
import type { WriteTransaction } from "./WriteTransaction"

const redoAsync = async (txn: WriteTransaction, mutationRef: MutationRef) => {
    const mutation = await txn.readMutation(mutationRef)
    addToLog(txn, mutation)
}

const redoSync = (txn: WriteTransaction, mutationRef: MutationRef) => {
    const mutation = txn.readMutation(mutationRef)
    addToLog(txn, mutation)
}
export const redo = (txn: WriteTransaction, mutationRef: MutationRef) => {
    if (txn.adapter.async) {
        return redoAsync(txn, mutationRef)
    } else {
        return redoSync(txn, mutationRef)
    }
}

const addToLog = (txn: WriteTransaction, mutation: any) => {
    mutation.log.forEach(([ref, action, document]: any) => {
        switch (action) {
            case "create": {
                const { ref, data, children, parents, ancestors } = document
                txn.createEntity(ref, { data, children, parents, ancestors })
                break
            }
            case "update": {
                txn.patchEntity(ref, document)
                break
            }
            case "delete": {
                txn.deleteEntity(ref)
                break
            }
            default: {
                throw new Error("Not implemented" + action)
            }
        }
    })
}
