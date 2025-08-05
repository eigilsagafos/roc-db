import * as z from "zod"

export const refSchemaGenerator = <const Entities extends string[]>(
    ...entityKinds: Entities
) => {
    return z.templateLiteral([
        z.enum(entityKinds, { error: "Invalid entity kind" }),
        z.literal("/"),
        z.number().int(),
    ])
}
