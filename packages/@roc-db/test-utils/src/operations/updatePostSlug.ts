import { Query, writeOperation } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "../schemas/PostRefSchema"
import { PostSchema } from "../schemas/PostSchema"

export const updatePostSlug = writeOperation(
    "updatePostSlug",
    z.object({ ref: PostRefSchema, slug: z.string() }),
    txn => {
        const { ref, slug } = txn.payload
        return Query(() => txn.patchEntity(ref, { data: { slug } }))
    },
    { debounce: 10, outputSchema: PostSchema },
)
