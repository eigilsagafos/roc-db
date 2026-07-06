import { entitySchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"

export const BlockParagraphSchema = entitySchemaGenerator("BlockParagraph", {
    data: z.object({
        content: z.string().optional(),
    }),
    parents: z.object({
        parent: PostRefSchema,
    }),
})

export type BlockParagraph = z.infer<typeof BlockParagraphSchema>
