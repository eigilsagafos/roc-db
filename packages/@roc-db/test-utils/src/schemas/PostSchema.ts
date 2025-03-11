import { entitySchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"
import { UserRefSchema } from "./UserRefSchema"

export const PostSchema = entitySchemaGenerator("Post", {
    ref: PostRefSchema,
    data: z.object({
        title: z.string(),
        text: z.string().optional(),
        tags: z.array(z.string()),
        slug: z.string().optional(),
    }),
    parents: z.object({ author: UserRefSchema.optional() }),
    children: z.object({ blocks: z.array(z.string()) }),
})

export type Post = z.infer<typeof PostSchema>
