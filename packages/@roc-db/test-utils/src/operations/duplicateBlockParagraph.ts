import { Query, QueryChain, writeOperation } from "roc-db"
import { z } from "zod"
import { BlockParagraphRefSchema } from "../schemas/BlockParagraphRefSchema"
import { BlockParagraphSchema } from "../schemas/BlockParagraphSchema"

// Copies the source paragraph's data as it is when the mutation runs.
export const duplicateBlockParagraph = writeOperation(
    "duplicateBlockParagraph",
    z.object({ ref: BlockParagraphRefSchema }).strict(),
    txn => {
        const copyRef = txn.createRef("BlockParagraph")
        return QueryChain(
            Query(() => txn.readEntity(txn.payload.ref)),
            Query((source: any) => txn.readEntity(source.parents.parent)),
            Query((parent: any) =>
                txn.patchEntity(parent.ref, {
                    children: { blocks: [...parent.children.blocks, copyRef] },
                }),
            ),
            Query((_parent: any, _readParent: any, source: any) =>
                txn.createEntity(copyRef, {
                    parents: source.parents,
                    data: source.data,
                }),
            ),
        )
    },
    { changeSetOnly: true, outputSchema: BlockParagraphSchema },
)
