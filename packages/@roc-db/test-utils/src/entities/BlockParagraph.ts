import { Entity } from "roc-db"
import { z } from "zod"
import { PostEntity } from "./PostEntity"
import { BlockRefSchema } from "../schemas/BlockRefSchema"

export const BlockParagraph = new Entity("BlockParagraph", {
    data: z.object({
        content: z.string().optional(),
    }),
    parents: z.object({
        parent: z.union([PostEntity.refSchema, BlockRefSchema]),
    }),
})
