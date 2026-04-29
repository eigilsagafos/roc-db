import { Query, writeOperation } from "roc-db"
import { z } from "zod"

export const updateOrgSettingsName = writeOperation(
    "updateOrgSettingsName",
    z.object({ name: z.string() }),
    txn => {
        const { name } = txn.payload
        return Query(() => txn.patchEntity("OrgSettings", { data: { name } }))
    },
    { debounce: 10 },
)
