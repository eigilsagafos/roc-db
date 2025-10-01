import * as z from "zod"

const GENERIC = z.templateLiteral([
    z.string().min(1, "Entity kind cannot be empty"),
    z.literal("/"),
    z.number().int(),
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
    return specific
}
