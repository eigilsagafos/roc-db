import { Query, readOperation } from "roc-db"
import { z } from "zod"

export const pageBlocks = readOperation(
    "pageBlocks",
    z.object({
        size: z.number().default(100),
        parentRef: z.string().optional(),
    }),
    txn => {
        const { size, parentRef } = txn.payload
        return Query(() =>
            txn.pageEntities({
                entities: ["BlockImage", "BlockParagraph"],
                size,
                childrenOf: parentRef ? [parentRef] : [],
            }),
        )
    },
)
