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

// What findDebounceTarget needs to know about: the changeSet's mutations from
// every identity, and on an optimistic adapter (a client with a sync queue)
// the identity's mutations anywhere. A server merging a root write only needs
// the identity's root mutations.
export const recentMutationsQuery = (
    request: DebounceRequest,
    now: Date,
    identityRef: string,
    optimistic: boolean,
): RecentMutationsQuery => {
    const changeSetRef = request.changeSetRef ?? null
    return {
        changeSetRef,
        identityRef,
        since: debounceSince(request, now),
        scopeMutations: changeSetRef !== null,
        identityMutations: optimistic
            ? "anywhere"
            : changeSetRef === null
              ? "root"
              : "none",
    }
}

const isLatestFirst = (a: Mutation, b: Mutation) =>
    isLaterOn(a, b, "timestamp") ? -1 : 1

/**
 * Picks the mutation a debounced write merges into, from the mutations
 * `findRecentMutations` returned for `recentMutationsQuery`.
 *
 * A row has a single position in replay order, so in a changeSet only a
 * consecutive write merges: the target must be the latest mutation in the
 * changeSet from any identity, on either clock. Root mutations are not
 * replayed, so any matching root row qualifies. On an optimistic adapter the
 * identity must also not have written anything after the target, anywhere,
 * which keeps its sync queue in order. Otherwise the write gets a new row,
 * which later consecutive writes merge into.
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
                ((changeSetRef !== null &&
                    inChangeSet(mutation, changeSetRef) &&
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

// What to look up before persisting a debounced version of `existing` in its
// changeSet: the mutations written after it, which include the rows the
// version could merge into.
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
 * If other mutations in the changeSet now follow that row (the client merged
 * across them, or had not seen another user's write yet), updating the row in
 * place would move the version past them. Persist the version as a fresh
 * debounced write from its identity instead: merged into the row it would merge
 * into today, or as a new row. Returns `null` for a retry of a version already
 * persisted that way, which is skipped like any resend.
 *
 * Only changeSet versions are rebased: root mutations are not replayed.
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
    const resent = recent.some(
        other =>
            other.ref !== existing.ref &&
            other.identityRef === mutation.identityRef &&
            other.operation.name === mutation.operation.name &&
            other.timestamp === mutation.timestamp &&
            deepEqual(other.payload, mutation.payload),
    )
    if (resent) return null
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
