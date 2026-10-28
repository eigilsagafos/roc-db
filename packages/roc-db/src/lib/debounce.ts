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

const debounceSince = (request: DebounceRequest, now: Date) =>
    new Date(now.getTime() - request.operation.debounce * 1000).toISOString()

// What findDebounceTarget needs to know about: the scope's mutations from
// every identity, and on an optimistic adapter (a client with a sync queue)
// the identity's mutations anywhere.
export const recentMutationsQuery = (
    request: DebounceRequest,
    now: Date,
    identityRef: string,
    optimistic: boolean,
): RecentMutationsQuery => ({
    changeSetRef: request.changeSetRef ?? null,
    identityRef,
    since: debounceSince(request, now),
    scopeMutations: true,
    identityMutations: optimistic ? "anywhere" : "none",
})

const isLatestFirst = (a: Mutation, b: Mutation) =>
    isLaterOn(a, b, "timestamp") ? -1 : 1

/**
 * Picks the mutation a debounced write merges into, from the mutations
 * `findRecentMutations` returned for `recentMutationsQuery`.
 *
 * A row has a single position in replay order, so only a consecutive write
 * merges, which keeps replaying the stored mutations equal to what happened:
 * the target must be the latest mutation in its changeSet (or root) from any
 * identity, on either clock. On an optimistic adapter the identity must also
 * not have written anything after the target, anywhere, which keeps its sync
 * queue in order. Otherwise the write gets a new row, which later consecutive
 * writes merge into.
 */
export const findDebounceTarget = (
    request: DebounceRequest,
    recent: Mutation[],
    now: Date,
    identityRef: string,
    optimistic: boolean,
) => {
    const changeSetRef = request.changeSetRef ?? null
    const since = debounceSince(request, now)
    const followed = (candidate: Mutation) =>
        recent.some(
            mutation =>
                mutation.ref !== candidate.ref &&
                ((inChangeSet(mutation, changeSetRef) &&
                    isLater(mutation, candidate)) ||
                    (optimistic &&
                        mutation.identityRef === identityRef &&
                        isLaterOn(mutation, candidate, "timestamp"))),
        )
    return recent
        .filter(
            candidate =>
                inChangeSet(candidate, changeSetRef) &&
                candidate.operation.name === request.operation.name &&
                candidate.payload?.ref === request.payload?.ref &&
                candidate.identityRef === identityRef &&
                candidate.timestamp > since &&
                !followed(candidate),
        )
        .sort(isLatestFirst)[0]
}

// What to look up before persisting a debounced version of `existing`: the
// mutations in its scope written after it, which include the rows the version
// could merge into.
export const rebaseQuery = (
    operation: WriteOperation,
    mutation: Mutation,
    existing: Mutation,
): RecentMutationsQuery => {
    const since = [
        debounceSince(
            { operation, payload: mutation.payload, changeSetRef: null },
            new Date(mutation.timestamp),
        ),
        existing.timestamp,
        existing.persistedAt,
    ]
        .filter((value): value is string => !!value)
        .sort()[0]
    return {
        changeSetRef: mutation.changeSetRef ?? null,
        identityRef: mutation.identityRef,
        // One millisecond earlier, so mutations sharing the timestamp are
        // returned for the id tiebreak.
        since: new Date(Date.parse(since) - 1).toISOString(),
        scopeMutations: true,
        identityMutations: "none",
    }
}

/**
 * A client sends a debounced version under the ref of the row it merged into.
 * If other mutations in its scope now follow that row (the client merged
 * across them, or had not seen another user's write yet), updating the row in
 * place would move the version past them. Persist the version as a fresh
 * debounced write from its identity instead: merged into the row it would merge
 * into today, or as a new row. Returns `null` for a retry of a version already
 * persisted that way, or of one a later version from the same session already
 * replaced, which is skipped like any resend.
 */
export const rebaseDebouncedVersion = (
    adapter: any,
    operation: WriteOperation,
    mutation: Mutation,
    existing: Mutation,
    recent: Mutation[],
): Mutation | null => {
    const changeSetRef = mutation.changeSetRef ?? null
    const followed = recent.some(
        other =>
            other.ref !== existing.ref &&
            inChangeSet(other, changeSetRef) &&
            isLater(other, existing),
    )
    if (!followed) return mutation
    // The client's versions of a row are written in order, so a row from the
    // same session that already holds a later version, or this exact one,
    // makes this a retry or a resend.
    const superseded = recent.some(
        other =>
            other.ref !== existing.ref &&
            inChangeSet(other, changeSetRef) &&
            other.identityRef === mutation.identityRef &&
            (other.sessionRef ?? null) === (mutation.sessionRef ?? null) &&
            other.operation.name === mutation.operation.name &&
            other.payload?.ref === mutation.payload?.ref &&
            (other.timestamp > mutation.timestamp ||
                (other.timestamp === mutation.timestamp &&
                    deepEqual(other.payload, mutation.payload))),
    )
    if (superseded) return null
    const target = findDebounceTarget(
        { operation, payload: mutation.payload, changeSetRef },
        recent,
        new Date(mutation.timestamp),
        mutation.identityRef,
        false,
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
