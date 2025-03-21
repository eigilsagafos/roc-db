import { entitySchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostVersionRefSchema } from "./PostVersionRefSchema"
import { PostRefSchema } from "./PostRefSchema"

export const PostVersionSchema = entitySchemaGenerator("Post", {
    ref: PostVersionRefSchema,
    data: z.object({
        version: z.number(),
        snapshot: z.array(z.any()),
    }),
    parents: z.object({ post: PostRefSchema }),
})

export type PostVersion = z.infer<typeof PostVersionSchema>
