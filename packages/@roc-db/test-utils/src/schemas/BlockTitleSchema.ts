import { entitySchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"

export const BlockTitleSchema = entitySchemaGenerator("BlockTitle", {
    data: z.object({
        content: z.string(),
    }),
    parents: z.object({
        post: PostRefSchema,
    }),
})
