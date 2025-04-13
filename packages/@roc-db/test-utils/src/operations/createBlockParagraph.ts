import { Query, QueryChain, writeOperation } from "roc-db"
import { z } from "zod"
import { BlockRowRefSchema } from "../schemas/BlockRowRefSchema"
import { PostRefSchema } from "../schemas/PostRefSchema"

export const createBlockParagrah = writeOperation(
    "createBlockParagraph",
    z
        .object({ parentRef: z.union([PostRefSchema, BlockRowRefSchema]) })
        .strict(),
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
    {
        changeSetOnly: true,
        outputSchema: z.object({
            block: z.any(),
            updatedParent: z.any(),
        }),
    },
)
