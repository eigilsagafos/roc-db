import { z } from "zod"
import { readOperation } from "../readOperation"
import { Query } from "../utils/Query"

// Entity paging resolves the entity set from the engine at runtime (via
// txn.pageEntities -> adapter.functions.pageEntities), so this needs no
// compile-time entity list — it's a plain operation like pageMutations.
export const pageEntities = readOperation(
    "pageEntities",
    z
        .object({
            size: z.number().default(30),
            skip: z.number().default(0),
            include: z
                .union([z.array(z.string()), z.literal("*")])
                .default("*"),
            exclude: z.array(z.string()).default([]),
        })
        .strict(),
    txn => {
        const { size, skip, include, exclude } = txn.payload
        return Query(() => txn.pageEntities({ size, skip, include, exclude }))
    },
)
