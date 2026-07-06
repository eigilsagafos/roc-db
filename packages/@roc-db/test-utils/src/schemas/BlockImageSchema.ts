import { entitySchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"

export const BlockImageSchema = entitySchemaGenerator("BlockImage", {
    data: z.object({
        url: z.string().url(),
    }),
    parents: z.object({
        post: PostRefSchema,
    }),
})
