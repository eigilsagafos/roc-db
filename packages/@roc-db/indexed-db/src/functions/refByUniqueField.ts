// export const refByUniqueField = (txn, entity, field, fieldIndex, value) => {
//     const { entityUniqueAtom } = txn.engineOpts
//     if (!entityUniqueAtom) throw new Error("No entityUniqueAtom")
//     return txn.engineOpts.txn.get(
//         entityUniqueAtom(`${entity}:${field}:${JSON.stringify(value)}`),
//     )
// }

export const refByUniqueField = async (
    txn,
    entity,
    field,
    fieldIndex,
    value,
) => {
    const objectStore = txn.engineOpts.txn.objectStore("entities")
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
}
