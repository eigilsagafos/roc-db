import { Query, writeOperation } from "roc-db"
import { PostSchema } from "../schemas/PostSchema"
import { CreatePostMutationSchema } from "../schemas/CreatePostMutationSchema"

export const createPost = writeOperation(
    CreatePostMutationSchema,
    PostSchema,
    txn => {
        const ref = txn.createRef("Post")
        const { title, slug, tags } = txn.payload
        return Query(() =>
            txn.createEntity(ref, {
                data: { title, tags, slug },
                children: { blocks: [] },
            }),
        )
    },
)
