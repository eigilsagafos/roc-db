export const readEntity = async (txn, ref) => {
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
