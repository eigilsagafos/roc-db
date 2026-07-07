import type { PageMutationsFunction } from "roc-db"
import type { IndexedDBTxnEngine } from "../types/IndexedDBEngine"

export const pageMutations: PageMutationsFunction = async (txn, args) => {
    const { size, changeSetRef, skip } = args
    const objectStore = (txn.engineOpts as IndexedDBTxnEngine).txn.objectStore(
        "mutations",
    )
    let idbRequest: IDBRequest
    if (changeSetRef) {
        const index = objectStore.index("byChangeSetRef")
        const range = IDBKeyRange.only(changeSetRef)
        idbRequest = index.openCursor(range)
    } else {
        idbRequest = objectStore.openCursor()
    }

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
}
