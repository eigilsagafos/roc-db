export const pageEntities = (txn, args) => {
    const { size, entities, childrenOf } = args
    const result = []
    for (const [, doc] of txn.engineOpts.entities) {
        if (size && result.length >= size) {
            break
        }
        if (entities && entities !== "*" && !entities.includes(doc.entity)) {
            continue
        } else {
            if (childrenOf && childrenOf.length > 0) {
                if (
                    !childrenOf.some(childRef =>
                        doc.__.parentRefs.includes(childRef),
                    )
                ) {
                    continue
                }
            }
            result.push(doc)
        }
    }
    return result
}
