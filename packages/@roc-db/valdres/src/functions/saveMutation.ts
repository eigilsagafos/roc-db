import type { SaveMutationFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const saveMutation: SaveMutationFunction<ValdresEngine> = (
    txn,
    finalizedMutation,
) => {
    const {
        mutationAtom,
        txn: valdresTxn,
        rootTxn,
    } = txn.engineOpts as ValdresTxnEngine
    const atom = mutationAtom(finalizedMutation.ref)
    // WARNING: (NO LONGER VALID) We treat the valdres adapter as a optimistic adapter, so we don't save the mutations on the root store
    // TODO: We should ensure that the mutations are saved on the root store when applying the change set
    // txn.engineOpts.rootTxn.set(atom, finalizedMutation)

    valdresTxn.set(atom, {
        ...finalizedMutation,
        initialized: true,
    } as typeof finalizedMutation)
    rootTxn.set(atom, finalizedMutation)

    return finalizedMutation
}
