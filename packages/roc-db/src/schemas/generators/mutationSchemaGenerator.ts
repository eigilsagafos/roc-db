import { z, type ZodSchema } from "zod"
import { RefSchema } from "../RefSchema"
import { MutationSchema } from "../MutationSchema"
import { MutationLogSchema } from "../MutationLogSchema"

export const mutationSchemaGenerator = <
    const Name extends string,
    Payload extends ZodSchema,
>(
    name: Name,
    payloadSchema: Payload,
    // Any schema is valid here — it's just placed into the `log` field.
    refsSchema: ZodSchema = MutationLogSchema,
    changeSetOnly: boolean = false,
) =>
    MutationSchema.extend({
        operation: z.object({
            name: z.literal(name),
            version: z.number().default(1),
        }),
        changeSetRef: changeSetOnly ? RefSchema : RefSchema.nullable(),
        payload: payloadSchema,
        log: refsSchema,
    })
