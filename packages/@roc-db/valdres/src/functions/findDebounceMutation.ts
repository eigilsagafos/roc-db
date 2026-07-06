import type { FindDebounceMutationFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const findDebounceMutation: FindDebounceMutationFunction<
    ValdresEngine
> = (request, engineOpts, now, mutationName, identityRef) => {
    const debounceTime = (request.operation as { debounce?: number }).debounce
    if (debounceTime === undefined) return
    // TODO: Make this more efficient. We could store a list of mutation refs pr operation seperatly if the operation supports debounce
    // const threshold = now - debounceTime * 1000
    const thresholdTime = new Date(
        now.getTime() - debounceTime * 1000,
    ).toISOString()
    const { mutationAtom, rootTxn } = engineOpts as ValdresTxnEngine
    const atoms = rootTxn.get(mutationAtom)
    const payloadRef = request.payload?.ref
    const atom = atoms.find(atom => {
        const mutation = rootTxn.get(atom)
        if (
            mutation &&
            mutation.operation.name === mutationName &&
            mutation.timestamp > thresholdTime &&
            mutation.payload?.ref === payloadRef &&
            (mutation as { identityRef?: string }).identityRef === identityRef
        ) {
            return true
        }
    })
    if (atom) {
        return rootTxn.get(atom)
    }
}
