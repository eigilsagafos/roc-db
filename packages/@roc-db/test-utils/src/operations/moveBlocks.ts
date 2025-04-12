import { Query, QueryChain, writeOperation } from "roc-db"
import { z } from "zod"
import { BlockParagraphRefSchema } from "../schemas/BlockParagraphRefSchema"
import { BlockRowRefSchema } from "../schemas/BlockRowRefSchema"

const PayloadSchema = z
    .object({
        refs: z.array(z.union([BlockParagraphRefSchema, BlockRowRefSchema])),
        targetPosition: z.number().min(0),
    })
    .strict()

export const moveBlocks = writeOperation("moveBlocks", PayloadSchema, txn => {
    const { refs } = txn.payload
    return QueryChain(
        Query(() => txn.batchReadEntities(refs)),
        Query(items => {
            // console.log("refs", items)
            return "todo"
        }),
    )
})
