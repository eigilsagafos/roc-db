import { entitySchemaGenerator } from "roc-db"
import { z } from "zod"
import { BlockTitleRefSchema } from "./BlockTitleRefSchema"
import { PostRefSchema } from "./PostRefSchema"

export const BlockTitleSchema = entitySchemaGenerator("BlockTitle", {
    ref: BlockTitleRefSchema,
    data: z.object({
        content: z.string(),
    }),
    parents: z.object({
        post: PostRefSchema,
    }),
})
