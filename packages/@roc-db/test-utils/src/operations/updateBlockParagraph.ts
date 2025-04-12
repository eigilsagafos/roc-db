import { Query, writeOperation } from "roc-db"
import { z } from "zod"
import { BlockParagraphRefSchema } from "../schemas/BlockParagraphRefSchema"
import { BlockParagraphSchema } from "../schemas/BlockParagraphSchema"

export const updateBlockParagraph = writeOperation(
    "updateBlockParagraph",
    z.object({
        ref: BlockParagraphRefSchema,
        content: z.string(),
    }),
    txn => {
        const { ref, content } = txn.payload
        return Query(() =>
            txn.patchEntity(ref, {
                data: { content },
            }),
        )
    },
    { outputSchema: BlockParagraphSchema },
)
