import type { IndexedDBReadTransaction } from "../types/IndexedDBReadTransaction"

export const pageMutations = async (txn: IndexedDBReadTransaction, args) => {
    const { size, changeSetRef, skip } = args
    const objectStore = txn.engineOpts.txn.objectStore("mutations")
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
