import type { WriteRequest } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const findDebounceMutation = (
    request: WriteRequest,
    engine: InMemoryEngine,
    now: number,
    mutationName: string,
) => {
    const debounceTime = request.operation.debounce
    // TODO: Make this more efficient. We could store a list of mutation refs pr operation seperatly if the operation supports debounce
    // const threshold = now - debounceTime * 1000
    const thresholdTime = new Date(now - debounceTime * 1000).toISOString()
    const res = engine.mutations.values().find(mutation => {
        if (
            mutation.operation.name === mutationName &&
            mutation.timestamp > thresholdTime &&
            mutation.payload.ref === request.payload.ref
        ) {
            return true
        }
    })
    return res
}
