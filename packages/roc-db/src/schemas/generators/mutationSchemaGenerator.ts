import { z, ZodSchema, ZodType } from "zod"
import { RefSchema } from "../RefSchema"
import { MutationSchema } from "../MutationSchema"
import { MutationLogSchema } from "../MutationLogSchema"

export const mutationSchemaGenerator = <
    const Name extends string,
    Payload extends ZodSchema,
>(
    name: Name,
    payloadSchema: Payload,
    refsSchema: ZodType<z.infer<typeof MutationLogSchema>> = MutationLogSchema,
    draftOnly: boolean = false,
) =>
    MutationSchema.extend({
        name: z.literal(name),
        changeSetRef: draftOnly ? RefSchema : RefSchema.nullable(),
        payload: payloadSchema,
        log: refsSchema,
    })
