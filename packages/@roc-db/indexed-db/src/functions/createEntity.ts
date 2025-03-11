import { entityFromRef, type CreateEntityFunction } from "roc-db"
import type { IndexedDBEngine } from "../types/IndexedDBEngine"

export const createEntity: CreateEntityFunction<IndexedDBEngine> = (
    txn,
    ref,
    { data = {}, children = {}, ancestors = {}, parents = {} },
) => {
    const objectStore = txn.engineOpts.txn.objectStore("entities")
    const entity = entityFromRef(ref)
    const document = {
        ref,
        created: {
            mutationRef: txn.mutation.ref,
            timestamp: txn.mutation.timestamp,
        },
        updated: {
            mutationRef: txn.mutation.ref,
            timestamp: txn.mutation.timestamp,
        },
        entity,
        data,
        children,
        ancestors,
        parents,
    }
    if (txn.request.changeSetRef) {
        if (txn.engineOpts.changeSet.entities.has(ref)) {
            throw new Error("Entity already exists in changeSet")
        } else {
            txn.engineOpts.changeSet.entities.set(ref, document)
            return document
        }
    } else {
        const request = objectStore.add(document)
        return new Promise((resolve, reject) => {
            request.onsuccess = event => {
                resolve(document)
            }
            request.onerror = event => {
                console.error(
                    "Error creating entity:",
                    document,
                    event?.target?.error,
                )
                reject(event?.target?.error)
            }
        })
    }
}
