import { Query, readOperation } from "roc-db"
import { PostSchema } from "../schemas/PostSchema"
import { z } from "zod"

export const readPostBySlug: any = readOperation(
    "readPostBySlug",
    z.string(),
    txn => {
        const slug = txn.payload
        return Query(() => txn.readEntityByUniqueField("Post", "slug", slug))
    },
    { outputSchema: PostSchema },
)
