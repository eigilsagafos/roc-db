import { Query, readOperation } from "roc-db"
import { PostSchema } from "../schemas/PostSchema"
import { PostRefSchema } from "../schemas/PostRefSchema"

export const readPost: any = readOperation(
    "readPost",
    PostRefSchema,
    PostSchema,
    txn => {
        const ref = txn.payload
        return Query(() => txn.readEntity(ref, true))
    },
)
