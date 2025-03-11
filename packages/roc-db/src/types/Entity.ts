import { z } from "zod"
import { EntitySchema } from "../schemas/EntitySchema"

export type Entity = z.infer<typeof EntitySchema>
