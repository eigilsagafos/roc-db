import { BadRequestError } from "../errors/BadRequestError"
import type { WriteRequest } from "../types/WriteRequest"
import { generateMutationDoc } from "./generateMutationDoc"

export const createMutationAsync = async (
    request: WriteRequest,
    engine,
    adapter,
    payload,
) => {
    if (request.optimisticMutation) {
        const current = await adapter.functions.readMutation(
            engine,
            request.optimisticMutation.ref,
        )
        if (
            current &&
            current.debounceCount === request.optimisticMutation.debounceCount
        ) {
            throw new BadRequestError("Mutation already synced")
        }
        return [request.optimisticMutation, request.optimisticMutation.log]
    }
    const now = new Date()
    if (request.operation.debounce) {
        const res = await adapter.functions.findDebounceMutation(
            request,
            engine,
            now,
            request.operation.name,
        )
        if (res) {
            return [
                {
                    ...res,
                    timestamp: now.toISOString(),
                    debounceCount: res.debounceCount + 1,
                    payload,
                },
                [],
            ]
        }
    }
    return [generateMutationDoc(request, adapter, payload, now), []]
}
