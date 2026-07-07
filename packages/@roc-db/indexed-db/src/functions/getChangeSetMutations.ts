import type { GetChangeSetMutationsFunction, Ref } from "roc-db"
import type { IndexedDBReadTransaction } from "../types/IndexedDBReadTransaction"
import type { IndexedDBTxnEngine } from "../types/IndexedDBEngine"

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Mutation[]` alias return directly. Params are typed manually and
// the value is cast to the alias for the AdapterFunctions check.
export const getChangeSetMutations: GetChangeSetMutationsFunction = ((
    txn: IndexedDBReadTransaction,
    changeSetRef: Ref,
) => {
    const objectStore = (txn.engineOpts as IndexedDBTxnEngine).txn.objectStore(
        "mutations",
    )
    const index = objectStore.index("byChangeSetRef")
    const range = IDBKeyRange.only(changeSetRef)
    const idbRequest = index.openCursor(range)

    return new Promise((resolve, reject) => {
        const results: any[] = []
        idbRequest.onsuccess = () => {
            const cursor = idbRequest.result
            if (cursor) {
                results.push(cursor.value)
                cursor.continue()
            } else {
                resolve(results)
            }
        }
    })
}) as unknown as GetChangeSetMutationsFunction
