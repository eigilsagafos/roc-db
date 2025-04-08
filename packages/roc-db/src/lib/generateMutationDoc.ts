import { generateRef } from "../utils/generateRef"
import { mutationNameFromSchema } from "./mutationNameFromSchema"

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

export const generateMutationDoc = (request, adapter, payload, now) => {
    const mutationName = mutationNameFromSchema(request.schema)

    const [ref, timestamp] = generateRefAndTimestamp(
        adapter,
        request.settings.debounce,
        now.toISOString(),
    )

    return {
        timestamp,
        ref,
        operation: {
            name: mutationName,
            version: 1,
        },
        payload,
        log: [],
        changeSetRef: request.changeSetRef,
        debounceCount: 0,
        sessionRef: adapter.session.ref,
        identityRef: adapter.session.identityRef,
    }
}
