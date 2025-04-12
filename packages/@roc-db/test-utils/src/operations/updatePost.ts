import { Query, writeOperation } from "roc-db"
import { PostSchema } from "../schemas/PostSchema"
import { z } from "zod"
import { PostRefSchema } from "../schemas/PostRefSchema"
import { UserRefSchema } from "../schemas/UserRefSchema"

const PayloadSchema = z.object({
    ref: PostRefSchema,
    title: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    authorRef: UserRefSchema.optional(),
})

export const updatePost = writeOperation(
    "updatePost",
    PayloadSchema,
    txn => {
        const { ref, authorRef, ...data } = txn.payload
        return Query(() =>
            txn.updateEntity(ref, {
                data: data,
                parents: { author: authorRef },
                children: { blocks: [] },
            }),
        )
    },
    { outputSchema: PostSchema },
)
