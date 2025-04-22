import { Query, QueryChain, writeOperation } from "roc-db"
import { z } from "zod"

export const crudBySlug = writeOperation(
    "crudBySlug",
    z.object({ slug: z.string(), newSlug: z.string() }),
    txn => {
        const { slug, newSlug } = txn.payload
        return QueryChain(
            Query(() => txn.readEntityByUniqueField("Post", "slug", slug)),
            Query(post =>
                txn.patchEntity(post.ref, { data: { slug: newSlug } }),
            ),
            Query(() => txn.readEntityByUniqueField("Post", "slug", newSlug)),
            Query(post => txn.deleteEntity(post.ref)),
            Query(() => {
                return [
                    txn.readEntityByUniqueField("Post", "slug", slug, false),
                    txn.readEntityByUniqueField("Post", "slug", newSlug, false),
                ]
            }),
        )
    },
)
