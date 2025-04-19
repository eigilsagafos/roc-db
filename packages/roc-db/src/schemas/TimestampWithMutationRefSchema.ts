import { z } from "zod"
import { MutationRefSchema } from "./MutationRefSchema"

export const TimestampWithMutationRefSchema = z.object({
    mutationRef: MutationRefSchema,
    timestamp: z.string().datetime({ precision: 3 }),
})
