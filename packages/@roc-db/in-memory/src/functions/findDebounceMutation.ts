import type { FindDebounceMutationFunction } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const findDebounceMutation: FindDebounceMutationFunction<
    InMemoryEngine
> = (request, engine, now, mutationName, identityRef) => {
    const debounceTime = request.operation.debounce
    // TODO: Make this more efficient. We could store a list of mutation refs pr operation seperatly if the operation supports debounce
    // const threshold = now - debounceTime * 1000
    const thresholdTime = new Date(
        now.getTime() - debounceTime * 1000,
    ).toISOString()
    const payloadRef = request.payload?.ref
    const res = engine.mutations.values().find(mutation => {
        if (
            mutation.operation.name === mutationName &&
            mutation.timestamp > thresholdTime &&
            mutation.payload?.ref === payloadRef &&
            mutation.identityRef === identityRef
        ) {
            return true
        }
    })
    return res
}
