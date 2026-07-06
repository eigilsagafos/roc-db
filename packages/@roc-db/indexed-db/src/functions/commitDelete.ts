import { entityFromRef, type Ref, type WriteTransaction } from "roc-db"
import type {
    IndexedDBEngine,
    IndexedDBTxnEngine,
} from "../types/IndexedDBEngine"

export const commitDelete = async (
    txn: WriteTransaction<IndexedDBEngine>,
    ref: Ref,
) => {
    const entity = entityFromRef(ref)
    const engineTxn = (txn.engineOpts as IndexedDBTxnEngine).txn
    let objectStore
    if (entity === "Mutation") {
        objectStore = engineTxn.objectStore("mutations")
    } else {
        objectStore = engineTxn.objectStore("entities")
    }
    const request = objectStore.delete(ref)

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(true)
        }

        request.onerror = event => {
            console.error(
                "Error deleting document",
                (event?.target as IDBRequest)?.error,
            )
            reject((event?.target as IDBRequest)?.error)
        }
    })
}
