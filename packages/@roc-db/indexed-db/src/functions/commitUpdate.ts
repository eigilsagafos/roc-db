import type { WriteTransaction } from "roc-db"
import type {
    IndexedDBEngine,
    IndexedDBTxnEngine,
} from "../types/IndexedDBEngine"

// Internal commit helper (not part of AdapterFunctions); second argument is the
// already DB-row-shaped document.
export const commitUpdate = async (
    txn: WriteTransaction<IndexedDBEngine>,
    document: any,
) => {
    const objectStore = (txn.engineOpts as IndexedDBTxnEngine).txn.objectStore(
        "entities",
    )
    const request = objectStore.put(document)
    return new Promise((resolve, reject) => {
        request.onsuccess = event => {
            resolve(document)
        }

        request.onerror = event => {
            console.error(
                "Error updating document",
                (event?.target as IDBRequest)?.error,
            )
            reject((event?.target as IDBRequest)?.error)
        }
    })
}
