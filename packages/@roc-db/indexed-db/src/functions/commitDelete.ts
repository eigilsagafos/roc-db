import { entityFromRef, type Ref, type WriteTransaction } from "roc-db"

export const commitDelete = async (txn: WriteTransaction, ref: Ref) => {
    const entity = entityFromRef(ref)
    let objectStore
    if (entity === "Mutation") {
        objectStore = txn.engineOpts.txn.objectStore("mutations")
    } else {
        objectStore = txn.engineOpts.txn.objectStore("entities")
    }
    const request = objectStore.delete(ref)

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(true)
        }

        request.onerror = event => {
            console.error("Error deleting document", event?.target?.error)
            reject(event?.target?.error)
        }
    })
}
