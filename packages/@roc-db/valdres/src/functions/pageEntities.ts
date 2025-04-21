export const pageEntities = (txn, args) => {
    const { size, skip, changeSetRef, entities, childrenOf } = args
    const { entityAtom } = txn.engineOpts
    const atoms = txn.engineOpts.txn.get(entityAtom)

    let res = []
    for (const atom of atoms) {
        const entity = txn.engineOpts.txn.get(atom)
        if (!entity) continue
        if (entities && entities !== "*" && !entities.includes(entity.entity))
            continue
        if (childrenOf && childrenOf.length > 0) {
            if (!entity.__.parentRefs?.some(ref => childrenOf.includes(ref)))
                continue
        }
        res.push(entity)
        if (res.length >= size) break
    }
    return res
}
