import type { WriteRequest } from "roc-db"

export const findDebounceMutation = (
    request: WriteRequest,
    engine: InMemoryEngine,
    now: number,
    mutationName: string,
    identityRef: string,
) => {
    const debounceTime = request.operation.debounce
    if (debounceTime === undefined) return
    // TODO: Make this more efficient. We could store a list of mutation refs pr operation seperatly if the operation supports debounce
    // const threshold = now - debounceTime * 1000
    const thresholdTime = new Date(now - debounceTime * 1000).toISOString()
    const { mutationAtom } = engine
    const atoms = engine.rootTxn.get(mutationAtom)
    const payloadRef = request.payload?.ref
    const atom = atoms.find(atom => {
        const mutation = engine.rootTxn.get(atom)
        if (
            mutation &&
            mutation.operation.name === mutationName &&
            mutation.timestamp > thresholdTime &&
            mutation.payload?.ref === payloadRef &&
            mutation.identityRef === identityRef
        ) {
            return true
        }
    })
    if (atom) {
        return engine.rootTxn.get(atom)
    }
}
