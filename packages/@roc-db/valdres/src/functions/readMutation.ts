import type { MutationRef } from "roc-db"
import type { ValdresEngine } from "../types/ValdresEngine"

export const readMutation = (engineOpts: ValdresEngine, ref: MutationRef) => {
    const { mutationAtom } = engineOpts
    const doc = engineOpts.txn.get(mutationAtom(ref))
    return doc
}
