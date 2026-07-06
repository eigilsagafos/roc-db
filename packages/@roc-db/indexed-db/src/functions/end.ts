import type { EndFunction } from "roc-db"
import type {
    IndexedDBEngine,
    IndexedDBTxnEngine,
} from "../types/IndexedDBEngine"

// The async adapter receives the transactional engine opts here (not a
// Transaction wrapper), and returns a Promise that settles when the IDB
// transaction completes. The value is cast to the alias for the
// AdapterFunctions check.
export const end: EndFunction<IndexedDBEngine> = ((
    engineOpts: IndexedDBTxnEngine,
) => {
    return new Promise((resolve, reject) => {
        engineOpts.txn.oncomplete = () => {
            resolve(undefined)
        }
        engineOpts.txn.onerror = event => {
            reject((event.target as IDBRequest).error)
        }
    })
}) as unknown as EndFunction<IndexedDBEngine>
