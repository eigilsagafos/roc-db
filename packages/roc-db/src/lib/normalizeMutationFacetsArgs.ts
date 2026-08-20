import { BadRequestError } from "../errors/BadRequestError"
import type {
    MutationFacetField,
    MutationFacetsArgs,
    NormalizedMutationFacetsArgs,
} from "../types/MutationFacets"
import { normalizePageMutationsArgs } from "./normalizePageMutationsArgs"

export const MUTATION_FACET_FIELDS: MutationFacetField[] = [
    "operationName",
    "identityRef",
]

export const normalizeMutationFacetsArgs = (
    args: MutationFacetsArgs | null | undefined = {},
): NormalizedMutationFacetsArgs => {
    const { fields, ...filter } = args ?? {}
    if (fields !== undefined) {
        if (!Array.isArray(fields) || fields.length === 0)
            throw new BadRequestError(
                "mutationFacets: `fields` must be a non-empty array. Omit it to facet every field.",
            )
        for (const field of fields) {
            if (!MUTATION_FACET_FIELDS.includes(field))
                throw new BadRequestError(
                    `mutationFacets: unknown field "${field}". Known fields: ${MUTATION_FACET_FIELDS.join(", ")}.`,
                )
        }
    }
    return {
        fields: fields ?? MUTATION_FACET_FIELDS,
        // Facets describe the whole matching set, so the paging args are not
        // part of the surface — `size: null` means "count everything".
        filter: normalizePageMutationsArgs({ ...filter, size: null }),
    }
}
