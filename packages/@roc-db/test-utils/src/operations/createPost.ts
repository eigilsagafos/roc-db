import { Query, writeOperation } from "roc-db"
import { z } from "zod"

const PayloadSchema = z
    .object({
        title: z.string(),
        slug: z.string().optional(),
        tags: z.array(z.string()).default([]),
    })
    .strict()

export const createPost = writeOperation("createPost", PayloadSchema, txn => {
    const ref = txn.createRef("Post")
    const { title, slug, tags } = txn.payload
    return Query(() =>
        txn.createEntity(ref, {
            data: { title, tags, slug },
            children: { blocks: [] },
        }),
    )
})
