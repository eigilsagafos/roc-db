import { Entity } from "roc-db"
import { z } from "zod"
import { UserRefSchema } from "../schemas"

export const PostEntity = new Entity("Post", {
    data: z.object({
        title: z.string(),
        text: z.string().optional(),
        tags: z.array(z.string()),
        slug: z.string().optional(),
    }),
    parents: z.object({ author: UserRefSchema.optional() }),
    children: z.object({ blocks: z.array(z.string()) }),
    indexedDataKeys: ["tags", "slug"],
    uniqueDataKeys: ["slug"],
})
