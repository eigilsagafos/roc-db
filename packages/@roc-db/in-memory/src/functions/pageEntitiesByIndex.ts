export const pageEntitiesByIndex = (txn, entity, field, value) => {
    const { entitiesIndex } = txn.engineOpts
    const indexKey = `${entity}:${field}:${JSON.stringify(value)}`
    const refs = entitiesIndex.get(indexKey) ?? []
    return refs.map(ref => txn.engineOpts.entities.get(ref))
}
