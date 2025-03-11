import { Query, writeOperation } from "roc-db"
import { CreateUserMutationSchema } from "../schemas/CreateUserMutationSchema"
import { PostSchema } from "../schemas/PostSchema"

export const createUser = writeOperation(
    CreateUserMutationSchema,
    PostSchema,
    txn => {
        const ref = txn.createRef("Post")
        return Query(() => txn.createEntity(ref, { data: { title: "Foo" } }))
    },
)
