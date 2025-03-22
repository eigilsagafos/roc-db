export const saveMutation = async (txn, finalizedMutation) => {
    const objectStore = txn.engineOpts.txn.objectStore("mutations")
    let request
    if (finalizedMutation.debounceCount > 0) {
        request = objectStore.put(finalizedMutation)
    } else {
        request = objectStore.add(finalizedMutation)
    }

    return new Promise((resolve, reject) => {
        request.onsuccess = event => {
            resolve(finalizedMutation)
        }
        request.onerror = event => {
            console.error("Error saving mutation", event?.target?.error)
            reject(event?.target?.error)
        }
    })
}
