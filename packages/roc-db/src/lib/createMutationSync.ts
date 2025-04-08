import { BadRequestError } from "../errors/BadRequestError"
import { RocRequest } from "../types/RocRequest"
import { WriteRequest } from "../types/WriteRequest"
import { generateMutationDoc } from "./generateMutationDoc"
import { mutationNameFromSchema } from "./mutationNameFromSchema"

export const createMutationSync = <
    Request extends RocRequest,
    Engine extends {},
>(
    request: WriteRequest,
    engine: Engine,
    adapter,
    payload,
) => {
    if (request.optimisticMutation) {
        const current = adapter.functions.readMutation(
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
    if (request.settings.debounce) {
        const res = adapter.functions.findDebounceMutation(
            request,
            engine,
            now,
            mutationNameFromSchema(request.schema),
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
