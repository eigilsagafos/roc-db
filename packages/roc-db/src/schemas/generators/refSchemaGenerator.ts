import * as z from "zod"

const GENERIC = z.union([
    z.templateLiteral([
        z.string().min(1, "Entity kind cannot be empty"),
        z.literal("/"),
        z.number().int(),
    ]),
    z
        .string()
        .min(1, "Entity kind cannot be empty")
        .refine(
            s => s.indexOf("/") === -1,
            'Bare refs must not contain "/"; valid refs are either <Kind> or <Kind>/<number>',
        ),
])

export const refSchemaGenerator = <const Entities extends string[]>(
    ...entityKinds: Entities
) => {
    if (entityKinds.length === 0) {
        return GENERIC as Entities["length"] extends 0 ? typeof GENERIC : never
    }
    const specific = z.templateLiteral([
        z.enum(entityKinds, { error: "Invalid entity kind" }),
        z.literal("/"),
        z.number().int(),
    ])
    // Tag the schema with the entity kinds it accepts, so callers (e.g. the
    // changeSet/version cross-entity validation) can recover them without
    // depending on zod internals. Read via `entityKindsFromRefSchema`.
    ;(specific as any).entityKinds = entityKinds
    return specific
}
