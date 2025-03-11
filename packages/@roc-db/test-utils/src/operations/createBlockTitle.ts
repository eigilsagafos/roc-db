import { Query, writeOperation } from "roc-db"
import { BlockTitleSchema } from "../schemas/BlockTitleSchema"
import { CreateBlockTitleMutationSchema } from "../schemas/CreateBlockTitleMutationSchema"

export const createBlockTitle = writeOperation(
    CreateBlockTitleMutationSchema,
    BlockTitleSchema,
    txn => {
        const ref = txn.createRef("BlockTitle")
        const { postRef } = txn.payload
        return Query(() =>
            txn.createEntity(ref, { parents: { post: postRef } }),
        )
    },
    { changeSetOnly: true },
)
