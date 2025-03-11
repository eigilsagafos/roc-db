import { readEntity } from "./readEntity"

export const updateEntity = async (
    txn,
    ref,
    { data = {}, children = {}, parents = {}, ancestors = {} },
) => {
    const currentEntity = await readEntity(txn, ref)
    const objectStore = txn.engineOpts.txn.objectStore("entities")
    const document = {
        ...currentEntity,
        updated: {
            mutationRef: txn.mutation.ref,
            timestamp: txn.mutation.timestamp,
        },
        data,
        children,
        parents,
        ancestors,
    }
    if (txn.request.changeSetRef) {
        throw new Error("TODO support changeSetRef")
    } else {
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
}
