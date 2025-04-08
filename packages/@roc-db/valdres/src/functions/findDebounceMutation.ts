import type { WriteOperation } from "roc-db"

export const findDebounceMutation = (
    request: WriteOperation,
    engine: InMemoryEngine,
    now,
    mutationName: string,
) => {
    const debounceTime = request.settings.debounce
    if (debounceTime === undefined) return
    // TODO: Make this more efficient. We could store a list of mutation refs pr operation seperatly if the operation supports debounce
    // const threshold = now - debounceTime * 1000
    const thresholdTime = new Date(now - debounceTime * 1000).toISOString()
    const { mutationAtom } = engine
    const atoms = engine.rootTxn.get(mutationAtom)
    const atom = atoms.find(atom => {
        const mutation = engine.rootTxn.get(atom)
        if (
            mutation &&
            mutation.operation.name === mutationName &&
            mutation.timestamp > thresholdTime &&
            mutation.payload.ref === request.payload.ref
        ) {
            return true
        }
    })
    if (atom) {
        return engine.rootTxn.get(atom)
    }
}
