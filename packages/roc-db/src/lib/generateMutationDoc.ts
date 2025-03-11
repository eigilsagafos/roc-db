import { createRef } from "../utils/createRef"

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
    return [createRef("Mutation", adapter.snowflake, now), now]
}

export const generateMutationDoc = (request, adapter, payload, now) => {
    const mutationName = request.schema.shape.name.value
    const [ref, timestamp] = generateRefAndTimestamp(
        adapter,
        request.settings.debounce,
        now.toISOString(),
    )

    return {
        timestamp,
        ref,
        name: mutationName,
        payload,
        log: [],
        changeSetRef: request.changeSetRef,
        debounceCount: 0,
    }
}
