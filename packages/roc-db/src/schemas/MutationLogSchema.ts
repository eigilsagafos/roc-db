import { z } from "zod"
import { RefSchema } from "./RefSchema"

export const MutationLogSchema = z.array(
    z.tuple([RefSchema, z.string(), RefSchema.nullable()]),
)
