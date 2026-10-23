import {
    Query,
    QueryChain,
    writeOperation,
    type WriteTransaction,
} from "roc-db"
import { z } from "zod"
import { BlockParagraphRefSchema } from "../schemas/BlockParagraphRefSchema"
import { BlockParagraphSchema } from "../schemas/BlockParagraphSchema"

const PayloadSchema = z
    .object({
        ref: BlockParagraphRefSchema,
        mentions: z.array(BlockParagraphRefSchema),
    })
    .strict()

// Every mentioned paragraph must exist, so the mutation depends on the
// mutations that created them.
const setMentions = (txn: WriteTransaction<any, any>) => {
    const { ref, mentions } = txn.payload
    return QueryChain(
        ...mentions.map((mention: string) =>
            Query(() => txn.readEntity(mention)),
        ),
        Query(() => txn.patchEntity(ref, { data: { mentions } })),
    )
}

export const updateBlockParagraphMentions = writeOperation(
    "updateBlockParagraphMentions",
    PayloadSchema,
    setMentions,
    { debounce: 10, changeSetOnly: true, outputSchema: BlockParagraphSchema },
)

export const setBlockParagraphMentions = writeOperation(
    "setBlockParagraphMentions",
    PayloadSchema,
    setMentions,
    { changeSetOnly: true, outputSchema: BlockParagraphSchema },
)
