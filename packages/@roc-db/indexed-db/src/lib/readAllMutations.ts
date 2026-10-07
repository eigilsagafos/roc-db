import type { Mutation } from "roc-db"
import type { IndexedDBTxnEngine } from "../types/IndexedDBEngine"

/**
 * Every row in the "mutations" store. The predicates `pageMutations` supports
 * (change-set tri-state, log-ref containment, keyset cursor) don't map onto a
 * single IDB index, so filtering happens in JS against the shared roc-db
 * helpers — same code the valdres and in-memory adapters run, which is what
 * keeps all three identical to the postgres SQL.
 */
export const readAllMutations = (engine: IndexedDBTxnEngine) =>
    new Promise<Mutation[]>((resolve, reject) => {
        const idbRequest = engine.txn.objectStore("mutations").openCursor()
        const results: Mutation[] = []
        idbRequest.onsuccess = () => {
            const cursor = idbRequest.result
            if (cursor) {
                results.push(cursor.value)
                cursor.continue()
            } else {
                resolve(results)
            }
        }
        idbRequest.onerror = () => reject(idbRequest.error)
    })
