import z from "zod"
import { RefSchema } from "../schemas/RefSchema"

// z.infer<typeof RefSchema>
export type Ref = `${string}/${string}`
