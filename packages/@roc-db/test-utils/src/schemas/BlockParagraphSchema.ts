import { entitySchemaGenerator } from "roc-db"
import { z } from "zod"
import { BlockParagraphRefSchema } from "./BlockParagraphRefSchema"
import { PostRefSchema } from "./PostRefSchema"

export const BlockParagraphSchema = entitySchemaGenerator("BlockParagraph", {
    ref: BlockParagraphRefSchema,
    data: z.object({
        content: z.string().optional(),
    }),
    parents: z.object({
        parent: PostRefSchema,
    }),
})

export type BlockParagraph = z.infer<typeof BlockParagraphSchema>
