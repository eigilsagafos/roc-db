export const getChangeSetMutations = (txn, changeSetRef) => {
    // return []
    if (!changeSetRef) throw new Error("changeSetRef is required")
    const res = []
    const { mutationAtom } = txn.engineOpts
    const atoms = txn.engineOpts.txn.get(mutationAtom)

    for (const atom of atoms) {
        const mutation = txn.engineOpts.txn.get(atom)
        if (mutation?.changeSetRef === changeSetRef) {
            res.push(mutation)
        }
    }
    return res
}
