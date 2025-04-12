import { Query, writeOperation } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "../schemas/PostRefSchema"
import { PostSchema } from "../schemas/PostSchema"

export const updatePostTitle = writeOperation(
    "updatePostTitle",
    z.object({ ref: PostRefSchema, title: z.string() }),
    txn => {
        const { ref, title } = txn.payload
        return Query(() => txn.patchEntity(ref, { data: { title } }))
    },
    { debounce: 10, outputSchema: PostSchema },
)
