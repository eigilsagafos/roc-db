import * as z from "zod"

// A concrete "<Kind>/<id>" ref. Deliberately NOT `RefSchema`, which also
// accepts a bare "<Kind>": that would happily parse "none" — or a typo like
// "nnone" — as a change-set ref and silently widen the query.
const QualifiedRefSchema = z.templateLiteral([
    z.string().min(1, "Entity kind cannot be empty"),
    z.literal("/"),
    z.number().int(),
])

const oneOrMany = <T extends z.ZodType>(schema: T) =>
    z.union([schema, z.array(schema).nonempty()])

/**
 * The predicates `pageMutations` and `mutationFacets` share. Paging args live
 * on `PageMutationsArgsSchema` only — facets describe the whole matching set.
 */
export const mutationFilterShape = {
    changeSet: z
        .union([z.literal("none"), z.literal("any"), QualifiedRefSchema])
        .optional(),
    /** @deprecated use `changeSet` */
    changeSetRef: QualifiedRefSchema.nullable().optional(),
    operationName: oneOrMany(z.string().min(1)).optional(),
    identityRef: oneOrMany(z.string().min(1)).optional(),
    logRefs: oneOrMany(QualifiedRefSchema).optional(),
}

export const PageMutationsArgsSchema = z
    .object({
        // `null` is unbounded. The default is a page rather than the whole
        // table: a full scan should be something you asked for.
        size: z.number().int().positive().nullable().default(30),
        before: z.iso.datetime({ offset: true }).optional(),
        beforeRef: z
            .templateLiteral([
                z.literal("Mutation"),
                z.literal("/"),
                z.number().int(),
            ])
            .optional(),
        ...mutationFilterShape,
    })
    // Strict so a misspelled or retired key — notably `skip`, which used to be
    // accepted and silently ignored — fails loudly instead of quietly
    // returning an unpaged result.
    .strict()
    .prefault({})
