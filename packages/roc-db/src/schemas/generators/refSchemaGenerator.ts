import * as z from "zod"

export const refSchemaGenerator = <const Entities extends string[]>(
    ...entityKinds: Entities
) => {
    if (entityKinds.length === 0) {
        return z.templateLiteral([
            z.string().min(1, "Entity kind cannot be empty"),
            z.literal("/"),
            z.number().int(),
        ])
    }
    return z.templateLiteral([
        z.enum(entityKinds, { error: "Invalid entity kind" }),
        z.literal("/"),
        z.number().int(),
    ])
}
