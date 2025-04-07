export const saveMutation = (txn, finalizedMutation) => {
    const { mutationAtom, mutationListAtom } = txn.engineOpts
    const atom = mutationAtom(txn.mutation.ref)
    // WARNING: (NO LONGER VALID) We treat the valdres adapter as a optimistic adapter, so we don't save the mutations on the root store
    // TODO: We should ensure that the mutations are saved on the root store when applying the change set
    // txn.engineOpts.rootTxn.set(atom, finalizedMutation)

    if (mutationListAtom) {
        txn.engineOpts.rootTxn.set(mutationListAtom, state => [
            ...state,
            txn.mutation.ref,
        ])
    }
    txn.engineOpts.rootTxn.set(atom, finalizedMutation)

    return finalizedMutation
}
