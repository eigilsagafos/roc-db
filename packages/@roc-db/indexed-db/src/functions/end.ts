import type { EndFunction } from "roc-db"
import type { IndexedDBEngine } from "../types/IndexedDBEngine"
import type { WriteRequest } from "roc-db/src/types/WriteRequest"

export const end: EndFunction<
    WriteRequest,
    IndexedDBEngine,
    [],
    any
> = engineOpts => {
    return new Promise((resolve, reject) => {
        engineOpts.txn.oncomplete = () => {
            resolve(undefined)
        }
        engineOpts.txn.onerror = event => {
            reject(event.target.error)
        }
    })
}
