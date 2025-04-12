import { Query, writeOperation } from "roc-db"
import { z } from "zod"
import { BlockRowRefSchema } from "../schemas/BlockRowRefSchema"
import { BlockTitleSchema } from "../schemas/BlockTitleSchema"
import { PostRefSchema } from "../schemas/PostRefSchema"

const PayloadSchema = z
    .object({ parentRef: z.union([PostRefSchema, BlockRowRefSchema]) })
    .strict()

export const createBlockTitle = writeOperation(
    "createBlockTitle",
    PayloadSchema,
    txn => {
        const ref = txn.createRef("BlockTitle")
        const { postRef } = txn.payload
        return Query(() =>
            txn.createEntity(ref, { parents: { post: postRef } }),
        )
    },
    { changeSetOnly: true, outputSchema: BlockTitleSchema },
)
