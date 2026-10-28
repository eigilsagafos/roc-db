import type { FindRecentMutationsFunction, Mutation } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const findRecentMutations: FindRecentMutationsFunction<ValdresEngine> = (
    engineOpts,
    { changeSetRef, identityRef, since, scopeMutations, identityMutations },
) => {
    // TODO: Make this more efficient. We could store a list of mutation refs pr operation seperatly if the operation supports debounce
    const { mutationAtom, rootTxn } = engineOpts as ValdresTxnEngine
    const afterSince = (mutation: Mutation) =>
        mutation.timestamp > since ||
        (!!mutation.persistedAt && mutation.persistedAt > since)
    const matches = (mutation: Mutation) => {
        const scope = mutation.changeSetRef ?? null
        if (
            scopeMutations !== false &&
            scope === changeSetRef &&
            afterSince(mutation)
        ) {
            return true
        }
        if (mutation.identityRef !== identityRef) return false
        if (identityMutations === undefined) return afterSince(mutation)
        if (identityMutations === "none") return false
        return mutation.timestamp > since
    }
    const res: Mutation[] = []
    for (const atom of rootTxn.get(mutationAtom)) {
        const mutation = rootTxn.get(atom)
        if (mutation && matches(mutation)) res.push(mutation)
    }
    return res
}
