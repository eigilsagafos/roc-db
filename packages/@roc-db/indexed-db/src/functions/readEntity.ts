import type { ReadEntityFunctiun } from "roc-db"
import type {
    IndexedDBEngine,
    IndexedDBTxnEngine,
} from "../types/IndexedDBEngine"
import { documentFromDBRow } from "../lib/documentFromDBRow"

export const readEntity: ReadEntityFunctiun<IndexedDBEngine> = async (
    txn,
    ref,
) => {
    const objectStore = (txn.engineOpts as IndexedDBTxnEngine).txn.objectStore(
        "entities",
    )
    const request = objectStore.get(ref)
    return new Promise((resolve, reject) => {
        request.onsuccess = event => {
            const result = (event.target as IDBRequest).result
            if (!result) {
                return resolve(undefined)
            }
            resolve(documentFromDBRow(result))
        }
        request.onerror = event => {
            reject((event.target as IDBRequest).error)
        }
    })
}
