import { NotFoundError, Query, QueryChain, readOperation } from "roc-db"
import { PostSchema } from "../schemas/PostSchema"
import { z } from "zod"
import { BlockImageSchema, BlockParagraphSchema } from "../schemas"

export const readEntity: any = readOperation(
    "readEntity",
    z.string(),
    txn => {
        const ref = txn.payload
        return QueryChain(
            Query(() => txn.readEntity(ref)),
            Query(entity => {
                if (!entity) {
                    throw new NotFoundError(ref)
                }
                return entity
            }),
        )
    },
    {
        outputSchema: z.union([
            PostSchema,
            BlockImageSchema,
            BlockParagraphSchema,
        ]),
    },
)
