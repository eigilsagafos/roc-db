export const getChangeSetMutations = (txn, changeSetRef) => {
    // TODO: Vadres is a bit different from the other adapters as the changeSet (scoped store) sticks around, so we have to figure out how to correctly handle this
    return []
    if (!changeSetRef) throw new Error("changeSetRef is required")
    const res = []
    const { mutationAtom } = txn.engineOpts
    const refs = txn.engineOpts.txn.get(mutationAtom)

    for (const ref of refs) {
        const mutation = txn.engineOpts.txn.get(mutationAtom(ref))
        if (mutation?.changeSetRef === changeSetRef) {
            res.push(mutation)
        }
    }
    return res
}
