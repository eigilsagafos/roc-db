export const refByUniqueField = (txn, entity, field, fieldIndex, value) => {
    const { entityUniqueAtom } = txn.engineOpts
    if (!entityUniqueAtom) throw new Error("No entityUniqueAtom")
    return txn.engineOpts.txn.get(entityUniqueAtom(entity, field, value))
}
