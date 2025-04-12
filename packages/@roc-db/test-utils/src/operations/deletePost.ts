import { Query, writeOperation } from "roc-db"
import { PostRefSchema } from "../schemas"

export const deletePost = writeOperation("deletePost", PostRefSchema, txn => {
    const ref = txn.payload
    return Query(() => txn.deleteEntity(ref, true))
})
