import type { FindRecentMutationsFunction, Mutation } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const findRecentMutations: FindRecentMutationsFunction<ValdresEngine> = (
    engineOpts,
    { changeSetRef, identityRef, since },
) => {
    // TODO: Make this more efficient. We could store a list of mutation refs pr operation seperatly if the operation supports debounce
    const { mutationAtom, rootTxn } = engineOpts as ValdresTxnEngine
    const res: Mutation[] = []
    for (const atom of rootTxn.get(mutationAtom)) {
        const mutation = rootTxn.get(atom)
        if (
            mutation &&
            (mutation.timestamp > since ||
                (!!mutation.persistedAt && mutation.persistedAt > since)) &&
            ((mutation.changeSetRef ?? null) === changeSetRef ||
                mutation.identityRef === identityRef)
        ) {
            res.push(mutation)
        }
    }
    return res
}
