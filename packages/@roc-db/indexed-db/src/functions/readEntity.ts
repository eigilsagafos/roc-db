import { DELETED_IN_CHANGE_SET_SYMBOL } from "roc-db"

export const readEntity = (txn, ref) => {
    if (txn.request.changeSetRef) {
        const doc = txn.engineOpts.changeSet.entities.get(ref)
        if (doc === DELETED_IN_CHANGE_SET_SYMBOL) return undefined
        if (doc) return doc
    }
    const objectStore = txn.engineOpts.txn.objectStore("entities")
    const request = objectStore.get(ref)
    return new Promise((resolve, reject) => {
        request.onsuccess = event => {
            const document = event.target.result
            resolve(document)
        }
        request.onerror = event => {
            reject(event.target.error)
        }
    })
}
