import { Query, writeOperation } from "roc-db"
import { UpdatePostTitleMutationSchema } from "../schemas/UpdatePostTitleMutationSchema"
import { PostSchema } from "../schemas/PostSchema"

export const updatePostTitle = writeOperation(
    UpdatePostTitleMutationSchema,
    PostSchema,
    txn => {
        const { ref, title } = txn.payload
        return Query(() => txn.patchEntity(ref, { data: { title } }))
    },
    { debounce: 10 },
)
