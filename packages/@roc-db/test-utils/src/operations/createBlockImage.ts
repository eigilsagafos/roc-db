import { Query, writeOperation } from "roc-db"
import { BlockImageSchema } from "../schemas/BlockImageSchema"
import { CreateBlockImageMutationSchema } from "../schemas/CreateBlockImageMutationSchema"

export const createBlockImage = writeOperation(
    CreateBlockImageMutationSchema,
    BlockImageSchema,
    txn => {
        const ref = txn.createRef("BlockImage")
        const { postRef } = txn.payload
        return Query(() =>
            txn.createEntity(ref, { parents: { post: postRef } }),
        )
    },
    { changeSetOnly: true },
)
