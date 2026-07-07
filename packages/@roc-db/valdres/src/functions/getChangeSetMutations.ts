import type { GetChangeSetMutationsFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const getChangeSetMutations: GetChangeSetMutationsFunction<
    ValdresEngine
> = (txn, changeSetRef) => {
    if (!changeSetRef) throw new Error("changeSetRef is required")
    const { mutationAtom, rootTxn } = txn.engineOpts as ValdresTxnEngine
    const atoms = rootTxn.get(mutationAtom)

    const res = []
    for (const atom of atoms) {
        const mutation = rootTxn.get(atom)
        if (mutation?.changeSetRef === changeSetRef) {
            res.push(mutation)
        }
    }
    return res
}
