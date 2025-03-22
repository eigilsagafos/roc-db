import { Query, writeOperation } from "roc-db"
import { UpdatePostDescriptionMutationSchema } from "../schemas/UpdatePostDescriptionMutationSchema"
import { PostSchema } from "../schemas/PostSchema"

export const updatePostDescription = writeOperation(
    UpdatePostDescriptionMutationSchema,
    PostSchema,
    txn => {
        const { ref, description } = txn.payload
        return Query(() => txn.patchEntity(ref, { data: { description } }))
    },
    { debounce: 10, changeSetOnly: true },
)
