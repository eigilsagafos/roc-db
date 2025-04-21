import { Query, readOperation } from "roc-db"
import { z } from "zod"

export const pagePosts: any = readOperation(
    "pagePosts",
    z.object({ size: z.number().default(100) }).default({}),
    txn => {
        const { size } = txn.payload
        return Query(() => txn.pageEntities({ entities: ["Post"], size }))
    },
)
