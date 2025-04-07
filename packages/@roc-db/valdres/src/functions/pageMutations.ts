export const pageMutations = (txn, args) => {
    const { size, skip, changeSetRef } = args
    const { mutationAtom } = txn.engineOpts
    const atoms = txn.engineOpts.rootTxn.get(mutationAtom)
    let res = []
    for (const atom of atoms) {
        const mutation = txn.engineOpts.rootTxn.get(atom)
        if (!mutation) continue
        if (changeSetRef && mutation?.changeSetRef !== changeSetRef) continue
        res.push(mutation)
        if (res.length >= size) break
    }
    return res
}
