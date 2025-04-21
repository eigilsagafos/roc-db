import { Query, writeOperation } from "roc-db"
import { z } from "zod"

export const createUser = writeOperation(
    "createUser",
    z.object({ email: z.string() }),
    txn => {
        const ref = txn.createRef("User")
        const { email } = txn.payload
        return Query(() => txn.createEntity(ref, { data: { email: email } }))
    },
)
