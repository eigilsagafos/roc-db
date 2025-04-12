import { Query, QueryChain, writeOperation } from "roc-db"
import { DraftRefSchema } from "../schemas/DraftRefSchema"

export const deleteDraft = writeOperation(
    "deleteDraft",
    DraftRefSchema,
    txn => {
        const ref = txn.payload
        return QueryChain(
            Query(() => txn.deleteEntity(ref, true)),
            Query(() => txn.deleteChangeSet(ref)),
        )
    },
)
