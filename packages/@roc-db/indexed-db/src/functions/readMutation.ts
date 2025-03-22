export const readMutation = async (engineOpts, ref) => {
    const objectStore = engineOpts.txn.objectStore("mutations")
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
