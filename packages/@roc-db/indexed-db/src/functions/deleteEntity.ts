import { DELETED_IN_CHANGE_SET_SYMBOL } from "roc-db"

const deleteIndexed = (store, ref) => {
    const request = store.delete(ref)

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

export const deleteEntity = async (txn, ref, cascade = false) => {
    if (txn.request.changeSetRef) {
        txn.engineOpts.changeSet.entities.set(ref, DELETED_IN_CHANGE_SET_SYMBOL)
        if (cascade) {
            throw new Error("TGOD")
        }
        return true
    } else {
        const objectStore = txn.engineOpts.txn.objectStore("entities")
        await deleteIndexed(objectStore, ref)
        if (cascade) {
            throw new Error("TGOD")
        }
        return true
    }
}
