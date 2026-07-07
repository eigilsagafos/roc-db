import type { FindDebounceMutationFunction, WriteRequest } from "roc-db"
import type {
    IndexedDBEngine,
    IndexedDBTxnEngine,
} from "../types/IndexedDBEngine"

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Mutation | null | undefined` alias return directly. Params are
// typed via the alias signature and the value is cast to the alias for the
// AdapterFunctions check.
export const findDebounceMutation: FindDebounceMutationFunction = ((
    request: WriteRequest,
    engine: IndexedDBEngine,
    now: Date,
    mutationName: string,
    identityRef: string,
) => {
    const objectStore = (engine as IndexedDBTxnEngine).txn.objectStore(
        "mutations",
    )
    const index = objectStore.index("timestamp")
    // `now` is a Date (per the alias). Core always passes a Date; using
    // getTime() is the numeric equivalent of the previous `now - ...`.
    const timestamp = new Date(
        now.getTime() - request.operation.debounce * 1000,
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
                    doc.operation.name === mutationName &&
                    doc.payload.ref === request.payload.ref &&
                    doc.changeSetRef === request.changeSetRef &&
                    doc.identityRef === identityRef
                ) {
                    results.push(doc)
                }
                cursor.continue()
            } else {
                if (results.length > 1) {
                    reject(new Error("Unhandled multiple debounced mutations"))
                    return
                }
                resolve(results[0])
            }
        }
        idbRequest.onerror = () => {
            reject(idbRequest.error)
        }
    })
}) as unknown as FindDebounceMutationFunction
