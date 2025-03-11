import { z } from "zod"
import { MutationRefSchema } from "../schemas/MutationRefSchema"

export type MutationRef = z.infer<typeof MutationRefSchema>
