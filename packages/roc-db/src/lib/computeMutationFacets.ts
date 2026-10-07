import type { Mutation } from "../types/Mutation"
import type {
    MutationFacet,
    MutationFacetField,
    MutationFacetsResult,
    NormalizedMutationFacetsArgs,
} from "../types/MutationFacets"
import { matchesMutationFilter } from "./filterAndPageMutations"

const facetValue = (mutation: Mutation, field: MutationFacetField) =>
    field === "operationName"
        ? (mutation.operation.name ?? null)
        : (mutation.identityRef ?? null)

/**
 * Count desc, then value asc so the order is total and stable. `null` (an
 * unset column) sorts last within its count, matching postgres's
 * `ORDER BY count DESC, value ASC NULLS LAST`.
 */
export const compareMutationFacets = (a: MutationFacet, b: MutationFacet) => {
    if (a.count !== b.count) return b.count - a.count
    if (a.value === b.value) return 0
    if (a.value === null) return 1
    if (b.value === null) return -1
    return a.value < b.value ? -1 : 1
}

/**
 * The in-process counterpart of the postgres `GROUP BY` facet queries. Shared
 * by valdres / in-memory / indexed-db so all three agree with the SQL.
 */
export const computeMutationFacets = (
    mutations: Iterable<Mutation | null | undefined>,
    args: NormalizedMutationFacetsArgs,
): MutationFacetsResult => {
    const counts = new Map<MutationFacetField, Map<string | null, number>>(
        args.fields.map(field => [field, new Map()]),
    )
    for (const mutation of mutations) {
        if (!mutation) continue
        if (!matchesMutationFilter(mutation, args.filter)) continue
        for (const field of args.fields) {
            const bucket = counts.get(field)!
            const value = facetValue(mutation, field)
            bucket.set(value, (bucket.get(value) ?? 0) + 1)
        }
    }
    const result: MutationFacetsResult = {}
    for (const field of args.fields) {
        result[field] = [...counts.get(field)!.entries()]
            .map(([value, count]) => ({ value, count }))
            .sort(compareMutationFacets)
    }
    return result
}
