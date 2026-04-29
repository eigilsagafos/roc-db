import { Query, writeOperation } from "roc-db"
import { z } from "zod"

export const createUnknownRef = writeOperation(
    "createUnknownRef",
    z.object({}).optional(),
    txn => Query(() => txn.createRef("NotARegisteredEntity")),
)
