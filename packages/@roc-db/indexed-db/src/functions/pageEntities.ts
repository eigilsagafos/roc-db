import type { IndexedDBReadTransaction } from "../types/IndexedDBReadTransaction"

export const pageEntities = async (txn: IndexedDBReadTransaction, args) => {
    const { size, entities, childrenOf } = args
    const objectStore = txn.engineOpts.txn.objectStore("entities")
    const idbRequest = objectStore.openCursor()
    return new Promise((resolve, reject) => {
        const results: any[] = []
        idbRequest.onsuccess = () => {
            if (results.length >= size) {
                resolve(results)
                return
            }
            const cursor = idbRequest.result
            if (cursor) {
                if (
                    entities &&
                    entities !== "*" &&
                    !entities.includes(cursor.value.entity)
                ) {
                    cursor.continue()
                } else {
                    if (
                        childrenOf &&
                        childrenOf.length > 0 &&
                        !childrenOf.some(
                            childRef =>
                                cursor.value.__.parentRefs.includes(childRef), // TODO: check if this is correct
                        )
                    ) {
                        cursor.continue()
                    } else {
                        results.push(cursor.value)
                        cursor.continue()
                    }
                }
            } else {
                resolve(results)
            }
        }
    })
}
