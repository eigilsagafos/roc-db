import { Query, QueryChain, writeOperation } from "roc-db"
import { z } from "zod"
import { BlockRowRefSchema } from "../schemas/BlockRowRefSchema"
import { PostRefSchema } from "../schemas/PostRefSchema"

export const createBlockRow = writeOperation(
    "createBlockRow",
    z
        .object({ parentRef: z.union([PostRefSchema, BlockRowRefSchema]) })
        .strict(),
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
    {
        changeSetOnly: true,
        outputSchema: z.object({
            block: z.any(),
            updatedParent: z.any(),
        }),
    },
)
