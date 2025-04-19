import { Entity } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "../schemas"

export const PostVersion = new Entity("PostVersion", {
    data: z.object({
        version: z.number(),
        snapshot: z.array(z.any()),
    }),
    parents: z.object({ post: PostRefSchema }),
    indexedDataKeys: ["version"],
    uniqueDataKeys: ["slug"],
})
