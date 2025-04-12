import { Query, writeOperation } from "roc-db"
import { z } from "zod"

export const createUser = writeOperation(
    "createUser",
    z.object({ email: z.string() }),
    txn => {
        const ref = txn.createRef("User")
        return Query(() => txn.createEntity(ref, { data: { name: "Foo" } }))
    },
)
