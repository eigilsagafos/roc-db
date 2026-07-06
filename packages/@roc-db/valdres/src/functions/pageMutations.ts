import type { PageMutationsFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const pageMutations: PageMutationsFunction<ValdresEngine> = (
    txn,
    args,
) => {
    const { size, skip, changeSetRef } = args
    const { mutationAtom, rootTxn } = txn.engineOpts as ValdresTxnEngine
    const atoms = rootTxn.get(mutationAtom)
    let res = []
    for (const atom of atoms) {
        const mutation = rootTxn.get(atom)
        if (!mutation) continue
        if (changeSetRef && mutation?.changeSetRef !== changeSetRef) continue
        res.push(mutation)
        if (res.length >= size) break
    }
    return res
}
