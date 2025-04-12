import { Query, writeOperation } from "roc-db"
import { z } from "zod"
import { BlockImageSchema } from "../schemas/BlockImageSchema"
import { PostRefSchema } from "../schemas/PostRefSchema"

export const createBlockImage = writeOperation(
    "createBlockImage",
    z.object({ postRef: PostRefSchema }).strict(),
    txn => {
        const ref = txn.createRef("BlockImage")
        const { postRef } = txn.payload
        return Query(() =>
            txn.createEntity(ref, { parents: { post: postRef } }),
        )
    },
    { changeSetOnly: true, outputSchema: BlockImageSchema },
)
