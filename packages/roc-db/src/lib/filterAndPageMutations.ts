import type { Mutation } from "../types/Mutation"
import type { NormalizedPageMutationsArgs } from "../types/PageMutationsArgs"
import type { Ref } from "../types/Ref"
import { idFromRef } from "../utils/idFromRef"

/**
 * The refs a mutation touched, i.e. the postgres `log_refs` column: the head of
 * every log entry. `saveMutation` derives the column the same way, so the
 * in-process adapters and the SQL one filter on identical data.
 */
export const mutationLogRefs = (mutation: Mutation): Ref[] =>
    Array.isArray(mutation.log)
        ? mutation.log.map((entry: any) => entry[0])
        : []

const mutationSortKey = (mutation: Mutation) => Date.parse(mutation.timestamp)

const mutationId = (mutation: Mutation) =>
    BigInt(idFromRef(mutation.ref) as string)

/**
 * Newest first, with the snowflake id as tiebreak. The id tiebreak is not
 * cosmetic: mutation timestamps are millisecond-precision, so a burst of writes
 * ties, and without a total order paging would drop or repeat rows. Mirrors
 * postgres's `ORDER BY timestamp DESC, id::numeric DESC`.
 */
export const compareMutationsNewestFirst = (a: Mutation, b: Mutation) => {
    const aKey = mutationSortKey(a)
    const bKey = mutationSortKey(b)
    if (aKey !== bKey) return bKey - aKey
    const aId = mutationId(a)
    const bId = mutationId(b)
    return aId < bId ? 1 : aId > bId ? -1 : 0
}

const matchesChangeSet = (
    mutation: Mutation,
    changeSet: NormalizedPageMutationsArgs["changeSet"],
) => {
    if (changeSet === "any") return true
    // Root mutations are `null` in postgres and `null`/`undefined` in the
    // in-process adapters depending on how the doc was built.
    if (changeSet === "none") return !mutation.changeSetRef
    return mutation.changeSetRef === changeSet
}

const matchesBefore = (
    mutation: Mutation,
    before: NormalizedPageMutationsArgs["before"],
) => {
    if (!before) return true
    const cursor = Date.parse(before.timestamp)
    const key = mutationSortKey(mutation)
    if (key !== cursor) return key < cursor
    if (!before.ref) return false
    return mutationId(mutation) < BigInt(idFromRef(before.ref) as string)
}

export const matchesMutationFilter = (
    mutation: Mutation,
    args: NormalizedPageMutationsArgs,
) => {
    if (!matchesChangeSet(mutation, args.changeSet)) return false
    if (!matchesBefore(mutation, args.before)) return false
    if (
        args.operationName &&
        !args.operationName.includes(mutation.operation.name)
    )
        return false
    if (args.identityRef && !args.identityRef.includes(mutation.identityRef))
        return false
    if (args.logRefs) {
        // Containment: every requested ref must appear in the log.
        const refs = mutationLogRefs(mutation)
        if (!args.logRefs.every(ref => refs.includes(ref))) return false
    }
    return true
}

/**
 * The whole `pageMutations` read for adapters that hold mutations in process
 * (valdres / in-memory / indexed-db): filter, order newest-first, then apply
 * the page size. Sharing this is what keeps those three byte-identical to each
 * other and to the postgres SQL.
 */
export const filterAndPageMutations = (
    mutations: Iterable<Mutation | null | undefined>,
    args: NormalizedPageMutationsArgs,
): Mutation[] => {
    const matched: Mutation[] = []
    for (const mutation of mutations) {
        if (!mutation) continue
        if (matchesMutationFilter(mutation, args)) matched.push(mutation)
    }
    matched.sort(compareMutationsNewestFirst)
    return args.size === null ? matched : matched.slice(0, args.size)
}
