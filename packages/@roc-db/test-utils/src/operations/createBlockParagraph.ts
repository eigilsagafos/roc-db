import { Query, QueryChain, writeOperation } from "roc-db"
import { BlockParagraphSchema } from "../schemas/BlockParagraphSchema"
import { CreateBlockParagraphMutationSchema } from "../schemas/CreateBlockParagraphMutationSchema"

export const createBlockParagrah = writeOperation(
    CreateBlockParagraphMutationSchema,
    BlockParagraphSchema,
    txn => {
        const ref = txn.createRef("BlockParagraph")
        const { parentRef } = txn.payload
        return QueryChain(
            Query(() => txn.readEntity(parentRef, true)),
            Query(parent =>
                txn.patchEntity(parentRef, {
                    children: { blocks: [...parent.children.blocks, ref] },
                }),
            ),
            Query(() =>
                txn.createEntity(ref, { parents: { parent: parentRef } }),
            ),
            Query((block, updatedParent) => ({ block, updatedParent })),
        )
    },
    { changeSetOnly: true },
)
