import type { ReadMutationFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const readMutation: ReadMutationFunction<ValdresEngine> = (
    engineOpts: ValdresTxnEngine,
    ref,
) => {
    const { mutationAtom, rootTxn } = engineOpts
    return rootTxn.get(mutationAtom(ref))
}
