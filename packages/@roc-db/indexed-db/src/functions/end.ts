import type { EndFunction } from "roc-db"
import type { IndexedDBEngine } from "../types/IndexedDBEngine"
import type { WriteRequest } from "roc-db/src/types/WriteRequest"

export const end: EndFunction<WriteRequest, IndexedDBEngine, [], any> = txn => {
    return new Promise((resolve, reject) => {
        txn.engineOpts.txn.oncomplete = () => {
            resolve(undefined)
        }
        txn.engineOpts.txn.onerror = event => {
            reject(event.target.error)
        }
    })
}
