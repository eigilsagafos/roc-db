import { Query, readOperation } from "roc-db"
import { z } from "zod"

export const readOrgSettings = readOperation(
    "readOrgSettings",
    z.object({}).optional(),
    txn => Query(() => txn.readEntity("OrgSettings", true)),
)
