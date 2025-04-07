import type { CreateEntityFunction } from "roc-db"
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
            console.error(
                "Error creating entity:",
                document,
                event?.target?.error,
            )
            reject(event?.target?.error)
        }
    })
}
