import { Query, writeOperation } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "../schemas/PostRefSchema"
import { PostSchema } from "../schemas/PostSchema"

export const updatePostDescription = writeOperation(
    "updatePostDescription",
    z.object({ ref: PostRefSchema, description: z.string() }),
    txn => {
        const { ref, description } = txn.payload
        return Query(() => txn.patchEntity(ref, { data: { description } }))
    },
    { debounce: 10, changeSetOnly: true, outputSchema: PostSchema },
)
