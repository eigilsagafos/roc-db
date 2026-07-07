import type { PageEntitiesByIndexFunction } from "roc-db"
import type { IndexedDBTxnEngine } from "../types/IndexedDBEngine"

export const pageEntitiesByIndex: PageEntitiesByIndexFunction = async (
    txn,
    entity,
    field,
    value,
) => {
    const objectStore = (txn.engineOpts as IndexedDBTxnEngine).txn.objectStore(
        "entities",
    )
    const index = objectStore.index("byIndexEntry")
    const entry = `${entity}:${field}:${JSON.stringify(value)}`
    const range = IDBKeyRange.only(entry)
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
