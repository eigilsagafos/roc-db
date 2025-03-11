import type { WriteOperation } from "roc-db"

export const findDebounceMutation = (
    request: WriteOperation,
    engine: InMemoryEngine,
    now,
) => {
    const debounceTime = request.settings.debounce
    if (debounceTime === undefined) return
    const mutationName = request.schema.shape.name.value
    // TODO: Make this more efficient. We could store a list of mutation refs pr operation seperatly if the operation supports debounce
    // const threshold = now - debounceTime * 1000
    const thresholdTime = new Date(now - debounceTime * 1000).toISOString()
    const { mutationAtom } = engine
    const refs = engine.txn.get(mutationAtom)
    const resRef = refs.find(ref => {
        const mutation = engine.txn.get(mutationAtom(ref))
        if (
            mutation &&
            mutation.name === mutationName &&
            mutation.timestamp > thresholdTime &&
            mutation.payload.ref === request.payload.ref
        ) {
            return true
        }
    })
    if (resRef) {
        return engine.txn.get(mutationAtom(resRef))
    }
}
