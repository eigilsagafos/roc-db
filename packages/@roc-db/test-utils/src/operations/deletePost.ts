import { Query, writeOperation } from "roc-db"
import { DeletePostMutationSchema } from "../schemas/DeletePostMutationSchema"

export const deletePost = writeOperation(
    DeletePostMutationSchema,
    undefined,
    txn => {
        const ref = txn.payload
        return Query(() => txn.deleteEntity(ref, true))
    },
)
