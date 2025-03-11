import { Query, writeOperation } from "roc-db"
import { PostSchema } from "../schemas/PostSchema"
import { UpdatePostMutationSchema } from "../schemas/UpdatePostMutationSchema"

export const updatePost = writeOperation(
    UpdatePostMutationSchema,
    PostSchema,
    txn => {
        const { ref, authorRef, ...data } = txn.payload
        return Query(() =>
            txn.updateEntity(ref, {
                data: data,
                parents: { author: authorRef },
                children: { blocks: [] },
            }),
        )
    },
)
