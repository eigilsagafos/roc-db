import type { WriteRequest } from "../types/WriteRequest"
import { generateRef } from "../utils/generateRef"

const generateRefAndTimestamp = (adapter, debounce, now) => {
    // const now = new Date().toISOString()
    if (debounce > 0 && adapter.debounceRef) {
        const id = adapter.debounceRef.split(`/`)[1]
        const res = adapter.snowflake.parse(id)
        const ellapsedTime = Date.now() - res[0]
        if (ellapsedTime < debounce * 1000) {
            return [adapter.debounceRef, res[0]]
        }
    }
    return [generateRef("Mutation", adapter.snowflake, now), now]
}

export const generateMutationDoc = (
    request: WriteRequest,
    adapter,
    payload: any,
    now,
) => {
    const [ref, timestamp] = generateRefAndTimestamp(
        adapter,
        request.operation.debounce,
        now.toISOString(),
    )

    if (!request.operation.name) throw new Error("Operation name is required")
    return {
        timestamp,
        ref,
        operation: {
            name: request.operation.name,
            version: request.operation.version,
        },
        payload,
        log: [],
        changeSetRef: request.changeSetRef,
        debounceCount: 0,
        sessionRef: adapter.session.ref ?? null,
        identityRef: adapter.session.identityRef,
    }
}
