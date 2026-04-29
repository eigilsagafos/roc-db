import { Query, writeOperation } from "roc-db"
import { z } from "zod"

export const deleteOrgSettings = writeOperation(
    "deleteOrgSettings",
    z.object({}).optional(),
    txn => Query(() => txn.deleteEntity("OrgSettings")),
)
