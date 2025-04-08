import { NotFoundError, Query, QueryChain, readOperation } from "roc-db"
import { z } from "zod"

export const readMutation: any = readOperation(
    "readMutation",
    z.string(),
    z.any(),
    txn => {
        const ref = txn.payload
        return QueryChain(
            Query(() => txn.readMutation(ref)),
            Query(entity => {
                if (!entity) {
                    throw new NotFoundError(ref)
                }
                return entity
            }),
        )
    },
)
