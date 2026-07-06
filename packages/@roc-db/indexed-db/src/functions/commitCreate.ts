import {
    createUniqueConstraintConflictError,
    type CreateEntityFunction,
} from "roc-db"
import type { IndexedDBEngine } from "../types/IndexedDBEngine"

export const commitCreate: CreateEntityFunction<IndexedDBEngine> = (
    txn,
    document,
) => {
    const objectStore = txn.engineOpts.txn.objectStore("entities")
    const request = objectStore.add(document)
    return new Promise((resolve, reject) => {
        request.onsuccess = event => {
            resolve(document)
        }
        request.onerror = event => {
            if (event?.target?.error?.name === "ConstraintError") {
                // Prevent the raw ConstraintError from bubbling to (and
                // aborting via) the transaction's error handler before our
                // converted ConflictError can propagate through the chain.
                event.stopPropagation()
                event.preventDefault()
                reject(createUniqueConstraintConflictError(document.entity))
            } else {
                console.error(
                    "Error creating entity:",
                    document,
                    event?.target?.error,
                )
                reject(event?.target?.error)
            }
        }
    })
}
