import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { BlockParagraphRefSchema } from "./BlockParagraphRefSchema"

export const UpdateBlockParagraphMutationSchema = mutationSchemaGenerator(
    "updateBlockParagraph",
    z.object({
        ref: BlockParagraphRefSchema,
        content: z.string(),
    }),
)
