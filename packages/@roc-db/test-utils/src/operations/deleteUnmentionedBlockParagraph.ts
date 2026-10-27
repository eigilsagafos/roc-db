import { BadRequestError, Query, QueryChain, writeOperation } from "roc-db"
import { z } from "zod"
import { BlockParagraphRefSchema } from "../schemas/BlockParagraphRefSchema"

// Refuses to delete a paragraph that `mentionedByRef` still mentions.
export const deleteUnmentionedBlockParagraph = writeOperation(
    "deleteUnmentionedBlockParagraph",
    z
        .object({
            ref: BlockParagraphRefSchema,
            mentionedByRef: BlockParagraphRefSchema,
        })
        .strict(),
    txn => {
        const { ref, mentionedByRef } = txn.payload
        return QueryChain(
            Query(() => txn.readEntity(mentionedByRef)),
            Query((mentionedBy: any) => {
                if (mentionedBy.data.mentions?.includes(ref)) {
                    throw new BadRequestError(
                        "Delete not allowed. Paragraph is mentioned",
                    )
                }
                return txn.readEntity(ref)
            }),
            Query((block: any) => txn.readEntity(block.parents.parent)),
            Query((parent: any) =>
                txn.patchEntity(parent.ref, {
                    children: {
                        blocks: parent.children.blocks.filter(
                            (blockRef: string) => blockRef !== ref,
                        ),
                    },
                }),
            ),
            Query(() => txn.deleteEntity(ref)),
        )
    },
    { changeSetOnly: true },
)
