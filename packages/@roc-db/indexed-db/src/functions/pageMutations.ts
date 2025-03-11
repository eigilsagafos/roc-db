import type { IndexedDBReadTransaction } from "../types/IndexedDBReadTransaction"

export const pageMutations = async (txn: IndexedDBReadTransaction, args) => {
    const { size, changeSetRef, skip } = args
    if (!changeSetRef) throw new Error("changeSetRef is required")
    const objectStore = txn.engineOpts.txn.objectStore("mutations")
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
}
