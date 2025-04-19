import { Entity } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "../schemas"

export const Draft = new Entity("Draft", {
    data: z.object({
        appliedAt: z.string().optional(),
    }),
    parents: z.object({
        post: PostRefSchema,
    }),
})
