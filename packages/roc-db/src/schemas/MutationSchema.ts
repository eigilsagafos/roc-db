import { z } from "zod"
import { RefSchema } from "./RefSchema"
import { MutationRefSchema } from "./MutationRefSchema"
import { MutationLogSchema } from "./MutationLogSchema"

export const MutationSchema = z
    .object({
        ref: MutationRefSchema,
        // name: z.any(),
        // name: z.literal("mutationName"),
        timestamp: z.string().datetime({ precision: 3 }),
        changeSetRef: RefSchema.nullable(),
        payload: z.any(),
        log: MutationLogSchema,
        debounceCount: z.number(),
        identityRef: z.string(),
        sessionRef: z.string().nullable().optional(),
        persistedAt: z
            .string()
            .datetime({ precision: 3 })
            .nullable()
            .optional(),
    })
    .strict()
