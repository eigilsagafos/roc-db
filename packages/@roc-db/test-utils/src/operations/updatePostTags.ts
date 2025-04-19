import { Query, writeOperation } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "../schemas/PostRefSchema"
import { PostSchema } from "../schemas/PostSchema"

export const updatePostTags = writeOperation(
    "updatePostTags",
    z.object({ ref: PostRefSchema, tags: z.array(z.string()) }),
    txn => {
        const { ref, tags } = txn.payload
        return Query(() => txn.patchEntity(ref, { data: { tags } }))
    },
    { debounce: 10, outputSchema: PostSchema },
)
