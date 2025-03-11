export const pageMutations = (txn, args) => {
    const { size, skip, changeSetRef } = args
    const { mutationAtom } = txn.engineOpts
    const refs = txn.engineOpts.txn.get(mutationAtom)

    let res = []
    for (const ref of refs) {
        const mutation = txn.engineOpts.txn.get(mutationAtom(ref))
        if (!mutation) continue
        if (changeSetRef && mutation?.changeSetRef !== changeSetRef) continue
        res.push(mutation)
        if (res.length >= size) break
    }
    return res
}
