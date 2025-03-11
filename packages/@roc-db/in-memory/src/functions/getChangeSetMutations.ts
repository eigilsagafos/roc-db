export const getChangeSetMutations = (txn, changeSetRef) => {
    if (!changeSetRef) throw new Error("changeSetRef is required")
    const res = []
    txn.engineOpts.mutations.forEach(mutation => {
        if (mutation.changeSetRef === changeSetRef) {
            res.push(mutation)
        }
    })
    return res
}
