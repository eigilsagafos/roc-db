import { entitySchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"
import { BlockRefSchema } from "./BlockRefSchema"

export const BlockRowSchema = entitySchemaGenerator("BlockRow", {
    children: z.object({
        blocks: z.array(BlockRefSchema),
    }),
    parents: z.object({
        post: PostRefSchema,
        block: BlockRefSchema,
    }),
})

export type BlockRow = z.infer<typeof BlockRowSchema>
