import { Query, QueryChain, writeOperation } from "roc-db"
import { BlockParagraphSchema } from "../schemas/BlockParagraphSchema"
import { CreateBlockRowMutationSchema } from "../schemas/CreateBlockRowMutationSchema"

export const createBlockRow = writeOperation(
    CreateBlockRowMutationSchema,
    BlockParagraphSchema,
    txn => {
        const ref = txn.createRef("BlockRow")
        const { parentRef } = txn.payload
        return QueryChain(
            Query(() => txn.readEntity(parentRef)),
            Query(parent => {
                return txn.patchEntity(parentRef, {
                    children: { blocks: [...parent.children.blocks, ref] },
                })
            }),
            Query(() =>
                txn.createEntity(ref, {
                    children: { blocks: [] },
                    parents: { parent: parentRef },
                }),
            ),
            Query((block, updatedParent) => ({ block, updatedParent })),
        )
    },
    { changeSetOnly: true },
)
