export const commitUpdate = async (txn, document) => {
    const objectStore = txn.engineOpts.txn.objectStore("entities")
    const request = objectStore.put(document)
    return new Promise((resolve, reject) => {
        request.onsuccess = event => {
            resolve(document)
        }

        request.onerror = event => {
            console.error("Error updating document", event?.target?.error)
            reject(event?.target?.error)
        }
    })
}
