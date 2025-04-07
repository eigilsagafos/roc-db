import { Query, QueryChain, writeOperation } from "roc-db"
import { MoveBlocksMutationSchema } from "../schemas/MoveBlocksMutationSchema"

export const moveBlocks = writeOperation(
    MoveBlocksMutationSchema,
    undefined,
    txn => {
        const { refs } = txn.payload
        return QueryChain(
            Query(() => txn.batchReadEntities(refs)),
            Query(items => {
                // console.log("refs", items)
                return "todo"
            }),
        )
    },
)
