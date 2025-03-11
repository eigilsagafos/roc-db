export const saveMutation = (txn, finalizedMutation) => {
    const { mutationAtom } = txn.engineOpts
    const atom = mutationAtom(txn.mutation.ref)
    txn.engineOpts.rootTxn.set(atom, finalizedMutation)
    return finalizedMutation
}
