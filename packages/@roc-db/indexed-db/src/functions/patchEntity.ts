import { deepPatch, NotFoundError } from "roc-db"
import { readEntity } from "./readEntity"
import type { IndexedDBReadTransaction } from "../types/IndexedDBReadTransaction"

export const patchEntity = async (
    txn: IndexedDBReadTransaction,
    ref,
    { data = {}, children = {}, parents = {}, ancestors = {} },
) => {
    const existingDocument = await readEntity(txn, ref)
    if (!existingDocument) throw new NotFoundError(ref)
    const updatedDocument = {
        ...existingDocument,
        updated: {
            timestamp: txn.mutation.timestamp,
            mutationRef: txn.mutation.ref,
        },
        data: deepPatch(existingDocument.data, data),
        children: deepPatch(existingDocument.children, children),
        parents: deepPatch(existingDocument.parents, parents),
        ancestors: deepPatch(existingDocument.ancestors, ancestors),
        // indexedData: deepPatch(existingEntity.indexedData, indexedData),
    }
    if (txn.request.changeSetRef) {
        txn.engineOpts.changeSet.entities.set(ref, updatedDocument)
        return updatedDocument
    } else {
        const objectStore = txn.engineOpts.txn.objectStore("entities")
        const request = objectStore.put(updatedDocument)

        return new Promise((resolve, reject) => {
            request.onsuccess = event => {
                resolve(updatedDocument)
            }

            request.onerror = event => {
                console.error("Error patching document", event?.target?.error)
                reject(event?.target?.error)
            }
        })
    }
}
