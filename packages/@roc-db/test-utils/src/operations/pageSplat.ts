import { Query, readOperation } from "roc-db"
import { z } from "zod"

export const pageSplat = readOperation(
    "pageSplat",
    z.object({ size: z.number().default(100) }),
    txn => {
        const { size } = txn.payload
        return Query(() => txn.pageEntities({ entities: "*", size }))
    },
)
