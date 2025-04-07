export const commitDelete = async (txn, ref, cascade = false) => {
    const objectStore = txn.engineOpts.txn.objectStore("entities")
    const request = objectStore.delete(ref)

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(true)
        }

        request.onerror = event => {
            console.error("Error patching document", event?.target?.error)
            reject(event?.target?.error)
        }
    })
}
