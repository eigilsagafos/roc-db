import type { RefByUniqueFieldFunction } from "roc-db"
import type { IndexedDBReadTransaction } from "../types/IndexedDBReadTransaction"
import type { IndexedDBTxnEngine } from "../types/IndexedDBEngine"

// export const refByUniqueField = (txn, entity, field, fieldIndex, value) => {
//     const { entityUniqueAtom } = txn.engineOpts
//     if (!entityUniqueAtom) throw new Error("No entityUniqueAtom")
//     return txn.engineOpts.txn.get(
//         entityUniqueAtom(`${entity}:${field}:${JSON.stringify(value)}`),
//     )
// }

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Ref | null` alias return directly. Params are typed manually and
// the value is cast to the alias for the AdapterFunctions check.
export const refByUniqueField: RefByUniqueFieldFunction = ((
    txn: IndexedDBReadTransaction,
    entity: string,
    field: string,
    fieldIndex: number,
    value: any,
) => {
    const objectStore = (txn.engineOpts as IndexedDBTxnEngine).txn.objectStore(
        "entities",
    )
    if (fieldIndex > 1) throw new Error("Field index must be 0 or 1")
    const index = objectStore.index(`unique_constraint_${fieldIndex}`)
    const range = IDBKeyRange.only([
        entity,
        `${field}:${JSON.stringify(value)}`,
    ])
    const idbRequest = index.openCursor(range)

    return new Promise((resolve, reject) => {
        idbRequest.onsuccess = () => {
            const cursor = idbRequest.result
            resolve(cursor?.value?.ref)
        }
    })
}) as unknown as RefByUniqueFieldFunction
