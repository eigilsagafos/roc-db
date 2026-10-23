import { BadRequestError } from "../errors/BadRequestError"
import type { RecentMutationsQuery } from "../types/AdapterFunctions"
import type { Mutation } from "../types/Mutation"
import type { WriteOperation } from "../types/WriteOperation"
import type { WriteRequest } from "../types/WriteRequest"
import { deepEqual } from "../utils/deepPatch"
import { generateRef } from "../utils/generateRef"
import { idFromRef } from "../utils/idFromRef"

type DebounceRequest = Pick<
    WriteRequest,
    "operation" | "payload" | "changeSetRef"
>

const mutationId = (mutation: Mutation) =>
    BigInt(idFromRef(mutation.ref) as string)

// Whether `a` sorts after `b` on `key`, with the same snowflake id tiebreak as
// sortMutations. Only defined when both have the key.
const isLaterOn = (
    a: Mutation,
    b: Mutation,
    key: "timestamp" | "persistedAt",
) => {
    const aKey = a[key]
    const bKey = b[key]
    if (!aKey || !bKey) return false
    if (aKey !== bKey) return aKey > bKey
    return mutationId(a) > mutationId(b)
}

// Replay sorts by `timestamp` or by `persistedAt` depending on what is
// persisted, so a mutation written after `b` on either clock counts.
const isLater = (a: Mutation, b: Mutation) =>
    isLaterOn(a, b, "timestamp") || isLaterOn(a, b, "persistedAt")

const inChangeSet = (mutation: Mutation, changeSetRef: string | null) =>
    (mutation.changeSetRef ?? null) === changeSetRef

export const recentMutationsQuery = (
    request: DebounceRequest,
    now: Date,
    identityRef: string,
): RecentMutationsQuery => ({
    changeSetRef: request.changeSetRef ?? null,
    identityRef,
    since: new Date(
        now.getTime() - request.operation.debounce * 1000,
    ).toISOString(),
})

/**
 * Picks the mutation a debounced write merges into, from the mutations
 * `findRecentMutations` returned for `recentMutationsQuery`.
 *
 * A row has a single position in replay order, so only a consecutive write
 * merges: the target must be the latest mutation in its changeSet (or root)
 * from any identity, and the identity must not have written anything after it
 * anywhere, which keeps a client's sync queue in order. Otherwise the write
 * gets a new row, which later consecutive writes merge into.
 */
export const findDebounceTarget = (
    request: DebounceRequest,
    recent: Mutation[],
    now: Date,
    identityRef: string,
) => {
    const { changeSetRef, since } = recentMutationsQuery(
        request,
        now,
        identityRef,
    )
    const relevant = recent.filter(
        mutation =>
            inChangeSet(mutation, changeSetRef) ||
            mutation.identityRef === identityRef,
    )
    return relevant.find(
        candidate =>
            inChangeSet(candidate, changeSetRef) &&
            candidate.operation.name === request.operation.name &&
            candidate.payload?.ref === request.payload?.ref &&
            candidate.identityRef === identityRef &&
            candidate.timestamp > since &&
            !relevant.some(
                mutation =>
                    mutation.ref !== candidate.ref &&
                    isLater(mutation, candidate),
            ),
    )
}

// What to look up before persisting a debounced version of `existing`: the
// mutations written after it, and the ones the version could merge into.
export const rebaseQuery = (
    operation: WriteOperation,
    mutation: Mutation,
    existing: Mutation,
): RecentMutationsQuery => {
    const query = recentMutationsQuery(
        { operation, payload: mutation.payload, changeSetRef: null },
        new Date(mutation.timestamp),
        mutation.identityRef,
    )
    const since = [query.since, existing.timestamp, existing.persistedAt]
        .filter((value): value is string => !!value)
        .sort()[0]
    return {
        changeSetRef: mutation.changeSetRef ?? null,
        identityRef: mutation.identityRef,
        // One millisecond earlier, so mutations sharing the timestamp are
        // returned for the id tiebreak.
        since: new Date(Date.parse(since) - 1).toISOString(),
    }
}

/**
 * A client sends a debounced version under the ref of the row it merged into.
 * If other mutations in the changeSet now follow that row (the client merged
 * across them, or had not seen another user's write yet), updating the row in
 * place would move the version past them. Persist the version as a fresh
 * debounced write from its identity instead: merged into the row it would merge
 * into today, or as a new row.
 */
export const rebaseDebouncedVersion = (
    adapter: any,
    operation: WriteOperation,
    mutation: Mutation,
    existing: Mutation,
    recent: Mutation[],
): Mutation => {
    const changeSetRef = mutation.changeSetRef ?? null
    const followed = recent.some(
        other =>
            other.ref !== existing.ref &&
            inChangeSet(other, changeSetRef) &&
            isLater(other, existing),
    )
    if (!followed) return mutation
    const resent = recent.some(
        other =>
            other.ref !== existing.ref &&
            other.identityRef === mutation.identityRef &&
            other.operation.name === mutation.operation.name &&
            other.timestamp === mutation.timestamp &&
            deepEqual(other.payload, mutation.payload),
    )
    if (resent) throw new BadRequestError("Mutation already synced")
    const target = findDebounceTarget(
        { operation, payload: mutation.payload, changeSetRef },
        recent,
        new Date(mutation.timestamp),
        mutation.identityRef,
    )
    if (target) {
        return {
            ...mutation,
            ref: target.ref,
            debounceCount: target.debounceCount + 1,
        }
    }
    return {
        ...mutation,
        ref: generateRef(
            "Mutation",
            adapter.snowflake,
            new Date().toISOString(),
        ) as Mutation["ref"],
        debounceCount: 0,
    }
}

export const mergeDebouncedVersion = (
    target: Mutation,
    adapter: any,
    payload: any,
    now: Date,
): Mutation => {
    const timestamp = now.toISOString()
    return {
        ...target,
        timestamp,
        debounceCount: target.debounceCount + 1,
        payload,
        // The merged version is new: an optimistic client has not synced it,
        // and a server persists it now.
        persistedAt: adapter.optimistic ? null : timestamp,
    }
}
