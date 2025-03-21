export const getChangeSetMutations = (txn, changeSetRef) => {
    // return []
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
