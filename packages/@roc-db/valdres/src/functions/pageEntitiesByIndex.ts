export const pageEntitiesByIndex = (txn, entity, key, value) => {
    const { entityIndexAtom, entityAtom } = txn.engineOpts
    if (!entityIndexAtom) throw new Error("No entityIndexAtom")
    const atom = entityIndexAtom(entity, key, value)
    const refs = txn.engineOpts.txn.get(atom)
    return refs.map(ref => txn.readEntity(ref))
}
