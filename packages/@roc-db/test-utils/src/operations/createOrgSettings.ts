import { Query, writeOperation } from "roc-db"
import { z } from "zod"
import { UserRefSchema } from "../schemas/UserRefSchema"

export const createOrgSettings = writeOperation(
    "createOrgSettings",
    z.object({
        name: z.string(),
        theme: z.string().optional(),
        primaryAdmin: UserRefSchema.optional(),
    }),
    txn => {
        const ref = txn.createRef("OrgSettings")
        const { name, theme, primaryAdmin } = txn.payload
        return Query(() =>
            txn.createEntity(ref, {
                data: { name, theme },
                parents: { primaryAdmin },
                children: { featuredPosts: [] },
            }),
        )
    },
)
