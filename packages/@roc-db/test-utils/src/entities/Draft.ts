import { Entity } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "../schemas"
import { PostVersionRefSchema } from "../schemas/PostVersionRefSchema"

export const Draft = new Entity("Draft", {
    changeSet: true,
    data: z.object({
        appliedAt: z.string().optional(),
    }),
    parents: z.object({
        post: PostRefSchema,
        // base-snapshot pointer; validated to reference a version entity
        version: PostVersionRefSchema.optional(),
    }),
})
