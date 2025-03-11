import type { WriteRequest } from "roc-db"
import type { IndexedDBEngine } from "../types/IndexedDBEngine"

export const findDebounceMutation = async (
    request: WriteRequest,
    engine: IndexedDBEngine,
    now: number,
) => {
    const mutationName = request.schema.shape.name.value
    const objectStore = engine.txn.objectStore("mutations")
    const index = objectStore.index("timestamp")
    const timestamp = new Date(
        now - request.settings.debounce * 1000,
    ).toISOString()
    const range = IDBKeyRange.lowerBound(timestamp, true) // timestamp > value
    const idbRequest = index.openCursor(range)

    return new Promise((resolve, reject) => {
        const results: any[] = []
        idbRequest.onsuccess = () => {
            const cursor = idbRequest.result
            if (cursor) {
                const doc = cursor.value
                if (
                    doc.name === mutationName &&
                    doc.payload.ref === request.payload.ref &&
                    doc.changeSetRef === request.changeSetRef
                ) {
                    results.push(doc)
                }
                cursor.continue()
            } else {
                if (results.length) {
                    if (results.length > 1) {
                        throw new Error(
                            "Unhandled multiple debounced mutations",
                        )
                    }
                    resolve(results[0])
                } else {
                    resolve(undefined)
                }
            }
        }
    })
}
