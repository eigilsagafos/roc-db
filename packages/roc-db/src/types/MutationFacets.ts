import type {
    NormalizedPageMutationsArgs,
    PageMutationsArgs,
} from "./PageMutationsArgs"

/** The mutation columns that can be faceted. */
export type MutationFacetField = "operationName" | "identityRef"

export type MutationFacet = {
    value: string | null
    count: number
}

/**
 * The distinct-values query a filter UI needs to populate itself: "which
 * operation names / identity refs exist in the set I'm about to filter?".
 *
 * Takes the same predicates as `pageMutations` minus the paging ones — facets
 * describe the whole matching set, so `size`/`before` would be meaningless.
 */
export type MutationFacetsArgs = Omit<
    PageMutationsArgs,
    "size" | "before" | "beforeRef"
> & {
    /** Which fields to facet. Defaults to all of them. */
    fields?: MutationFacetField[]
}

export type NormalizedMutationFacetsArgs = {
    fields: MutationFacetField[]
    filter: NormalizedPageMutationsArgs
}

/** One entry per requested field, each sorted by count desc then value asc. */
export type MutationFacetsResult = {
    [Field in MutationFacetField]?: MutationFacet[]
}
