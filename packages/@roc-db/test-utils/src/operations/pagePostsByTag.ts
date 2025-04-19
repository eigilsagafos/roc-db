import { Query, readOperation } from "roc-db"
import { z } from "zod"

export const pagePostsByTag: any = readOperation(
    "pagePostsByTag",
    z.string(),
    txn => {
        const tag = txn.payload
        return Query(() => txn.pageEntitiesByIndex("Post", "tags", tag))
    },
)
