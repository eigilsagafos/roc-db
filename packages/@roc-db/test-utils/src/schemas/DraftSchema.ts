import { entitySchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"
import { DraftRefSchema } from "./DraftRefSchema"

export const DraftSchema = entitySchemaGenerator("Draft", {
    ref: DraftRefSchema,
    parents: z.object({
        post: PostRefSchema,
    }),
})
