import { createUniqueConstraintConflictError } from "roc-db"
import type { WriteTransaction } from "roc-db"
import type {
    IndexedDBEngine,
    IndexedDBTxnEngine,
} from "../types/IndexedDBEngine"

// Internal commit helper (not part of AdapterFunctions). It takes the already
// DB-row-shaped document as its second argument, so it can't use the
// contract's `CreateEntityFunction` (txn, ref, args) shape.
export const commitCreate = (
    txn: WriteTransaction<IndexedDBEngine>,
    document: any,
) => {
    const objectStore = (txn.engineOpts as IndexedDBTxnEngine).txn.objectStore(
        "entities",
    )
    const request = objectStore.add(document)
    return new Promise((resolve, reject) => {
        request.onsuccess = event => {
            resolve(document)
        }
        request.onerror = event => {
            const error = (event?.target as IDBRequest)?.error
            if (error?.name === "ConstraintError") {
                // Prevent the raw ConstraintError from bubbling to (and
                // aborting via) the transaction's error handler before our
                // converted ConflictError can propagate through the chain.
                event.stopPropagation()
                event.preventDefault()
                reject(createUniqueConstraintConflictError(document.entity))
            } else {
                console.error("Error creating entity:", document, error)
                reject(error)
            }
        }
    })
}
