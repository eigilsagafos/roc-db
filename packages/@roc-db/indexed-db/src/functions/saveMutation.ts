import type { Mutation, SaveMutationFunction } from "roc-db"
import type { IndexedDBTxnEngine } from "../types/IndexedDBEngine"
import type { IndexedDBWriteTransaction } from "../types/IndexedDBWriteTransaction"

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Mutation` alias return directly. Params are typed manually and
// the value is cast to the alias for the AdapterFunctions check.
export const saveMutation: SaveMutationFunction = ((
    txn: IndexedDBWriteTransaction,
    finalizedMutation: Mutation,
) => {
    const objectStore = (txn.engineOpts as IndexedDBTxnEngine).txn.objectStore(
        "mutations",
    )
    let request
    if (finalizedMutation.debounceCount > 0 || finalizedMutation.appliedAt) {
        request = objectStore.put(finalizedMutation)
    } else {
        request = objectStore.add(finalizedMutation)
    }

    return new Promise((resolve, reject) => {
        request.onsuccess = event => {
            resolve(finalizedMutation)
        }
        request.onerror = event => {
            console.error(
                "Error saving mutation",
                (event?.target as IDBRequest)?.error,
            )
            reject((event?.target as IDBRequest)?.error)
        }
    })
}) as unknown as SaveMutationFunction
