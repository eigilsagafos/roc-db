export const getChangeSetMutations = (txn, changeSetRef) => {
    if (!changeSetRef) throw new Error("changeSetRef is required")
    const { mutationAtom } = txn.engineOpts
    const atoms = txn.engineOpts.rootTxn.get(mutationAtom)

    const res = []
    for (const atom of atoms) {
        const mutation = txn.engineOpts.rootTxn.get(atom)
        if (mutation?.changeSetRef === changeSetRef) {
            res.push(mutation)
        }
    }
    return res
}
