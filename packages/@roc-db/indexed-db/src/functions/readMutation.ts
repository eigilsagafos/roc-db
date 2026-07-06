import type { ReadMutationFunction, Ref } from "roc-db"
import type { IndexedDBTxnEngine } from "../types/IndexedDBEngine"

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Mutation | null` alias return directly. Params are typed
// manually and the value is cast to the alias for the AdapterFunctions check.
export const readMutation: ReadMutationFunction = ((
    engineOpts: IndexedDBTxnEngine,
    ref: Ref,
) => {
    const objectStore = engineOpts.txn.objectStore("mutations")
    const request = objectStore.get(ref)
    return new Promise((resolve, reject) => {
        request.onsuccess = event => {
            const document = (event.target as IDBRequest).result
            resolve(document)
        }
        request.onerror = event => {
            reject((event.target as IDBRequest).error)
        }
    })
}) as unknown as ReadMutationFunction
