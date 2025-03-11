import { Query, writeOperation } from "roc-db"
import { UpdateBlockParagraphMutationSchema } from "../schemas/UpdateBlockParagraphMutationSchema"
import { BlockParagraphRefSchema } from "../schemas/BlockParagraphRefSchema"

export const updateBlockParagraph = writeOperation(
    UpdateBlockParagraphMutationSchema,
    BlockParagraphRefSchema,
    txn => {
        const { ref, content } = txn.payload
        return Query(() =>
            txn.patchEntity(ref, {
                data: { content },
            }),
        )
    },
)
