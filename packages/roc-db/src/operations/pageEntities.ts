import { z } from "zod"
import { readOperation } from "../readOperation"
import { Query } from "../utils/Query"

// Entity paging resolves the entity set from the engine at runtime (via
// txn.pageEntities -> adapter.functions.pageEntities), so this needs no
// compile-time entity list — it's a plain operation like pageMutations.
//
// `entities` is the kind filter every adapter honors: an array of entity kinds,
// or "*" for all kinds. (The previous `include`/`exclude` payload was inert —
// no adapter read those keys, so kind filtering silently did nothing.)
export const pageEntities = readOperation(
    "pageEntities",
    z
        .object({
            size: z.number().default(30),
            entities: z
                .union([z.array(z.string()), z.literal("*")])
                .default("*"),
        })
        .strict(),
    txn => {
        const { size, entities } = txn.payload
        return Query(() => txn.pageEntities({ size, entities }))
    },
)
