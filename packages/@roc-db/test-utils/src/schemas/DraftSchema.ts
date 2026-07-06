import { entitySchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"

export const DraftSchema = entitySchemaGenerator("Draft", {
    parents: z.object({
        post: PostRefSchema,
    }),
})
