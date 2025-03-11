import { entitySchemaGenerator } from "roc-db"
import { z } from "zod"
import { BlockImageRefSchema } from "./BlockImageRefSchema"
import { PostRefSchema } from "./PostRefSchema"

export const BlockImageSchema = entitySchemaGenerator("BlockImage", {
    ref: BlockImageRefSchema,
    data: z.object({
        url: z.string().url(),
    }),
    parents: z.object({
        post: PostRefSchema,
    }),
})
