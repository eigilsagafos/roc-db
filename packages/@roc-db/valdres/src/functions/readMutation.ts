import type { MutationRef } from "roc-db"
import type { ValdresEngine } from "../types/ValdresEngine"

export const readMutation = (engineOpts: ValdresEngine, ref: MutationRef) => {
    const { mutationAtom } = engineOpts
    return engineOpts.rootTxn.get(mutationAtom(ref))
}
