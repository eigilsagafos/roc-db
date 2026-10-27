import { BadRequestError } from "../errors/BadRequestError"
import type { WriteRequest } from "../types/WriteRequest"
import {
    findDebounceTarget,
    mergeDebouncedVersion,
    recentMutationsQuery,
} from "./debounce"
import { generateMutationDoc } from "./generateMutationDoc"

export const createMutationAsync = async (
    request: WriteRequest,
    engine: any,
    adapter: any,
    payload: any,
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
        const identityRef = adapter.session.identityRef
        const recent = await adapter.functions.findRecentMutations(
            engine,
            recentMutationsQuery(request, now, identityRef),
        )
        const target = findDebounceTarget(request, recent, now, identityRef)
        if (target) {
            return [mergeDebouncedVersion(target, adapter, payload, now), []]
        }
    }
    return [generateMutationDoc(request, adapter, payload, now), []]
}
