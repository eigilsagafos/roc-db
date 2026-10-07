import { readOperation } from "../readOperation"
import { MutationFacetsArgsSchema } from "../schemas/MutationFacetsArgsSchema"
import { Query } from "../utils/Query"

/**
 * Distinct values and counts for the mutation columns a filter UI offers, so
 * it can populate itself without reading the whole log: which operation names
 * and identity refs exist within a given `pageMutations` predicate set.
 *
 * Takes the same predicates as `pageMutations` minus the paging ones, and
 * returns one bucket per requested field, ordered by count desc then value asc.
 */
export const mutationFacets = readOperation(
    "mutationFacets",
    MutationFacetsArgsSchema,
    txn => Query(() => txn.mutationFacets(txn.payload)),
)
