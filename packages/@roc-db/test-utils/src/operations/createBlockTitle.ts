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
        // Payload field is `parentRef` (was mistakenly read as `postRef`, which
        // is undefined, so the parent was never set).
        const { parentRef } = txn.payload
        return Query(() =>
            txn.createEntity(ref, { parents: { post: parentRef } }),
        )
    },
    { changeSetOnly: true, outputSchema: BlockTitleSchema },
)
