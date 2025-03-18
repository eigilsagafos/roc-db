export const pageEntities = (txn, args) => {
    const { size, skip, changeSetRef, include, exclude } = args
    const { entityAtom } = txn.engineOpts
    const refs = txn.engineOpts.txn.get(entityAtom)

    let res = []
    for (const ref of refs) {
        const entity = txn.engineOpts.txn.get(entityAtom(ref))
        if (!entity) continue
        if (include && include[0] !== "*" && !include.includes(entity.entity))
            continue
        res.push(entity)
        if (res.length >= size) break
    }
    return res
}
