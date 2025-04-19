import { Entity } from "roc-db"
import { z } from "zod"
import { PostEntity } from "./PostEntity"
import { BlockRefSchema } from "../schemas/BlockRefSchema"

export const BlockRow = new Entity("BlockRow", {
    children: z.object({
        blocks: z.array(BlockRefSchema),
    }),
    parents: z.object({
        // post: Post.refSchema,
        parent: z.union([PostEntity.refSchema, BlockRefSchema]),
    }),
})
