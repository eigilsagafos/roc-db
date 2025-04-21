import { Entity } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "../schemas"

export const BlockImageEntity = new Entity("BlockImage", {
    data: z.object({
        url: z.string().url(),
    }),
    parents: z.object({
        parent: PostRefSchema,
    }),
})
