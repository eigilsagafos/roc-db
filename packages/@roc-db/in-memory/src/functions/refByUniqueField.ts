export const refByUniqueField = (
    txn: WriteTransaction,
    entity: string,
    field: string,
    fieldIndex: number,
    value: any,
) => {
    const key = `${entity}:${field}:${JSON.stringify(value)}`
    const { entitiesUnique } = txn.engineOpts
    if (entitiesUnique.has(key)) {
        return entitiesUnique.get(key)
    }
}
