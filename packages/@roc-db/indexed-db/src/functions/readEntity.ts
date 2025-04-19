import { documentFromDBRow } from "../lib/documentFromDBRow"

export const readEntity = async (txn, ref) => {
    const objectStore = txn.engineOpts.txn.objectStore("entities")
    const request = objectStore.get(ref)
    return new Promise((resolve, reject) => {
        request.onsuccess = event => {
            const result = event.target.result
            if (!result) {
                return resolve(undefined)
            }
            resolve(documentFromDBRow(result))
        }
        request.onerror = event => {
            reject(event.target.error)
        }
    })
}
