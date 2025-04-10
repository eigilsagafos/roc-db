import { Query, QueryChain, writeOperation } from "roc-db"
import { DeleteDraftMutationSchema } from "../schemas/DeleteDraftMutationSchema"

export const deleteDraft = writeOperation(
    DeleteDraftMutationSchema,
    undefined,
    txn => {
        const ref = txn.payload
        return QueryChain(
            Query(() => txn.deleteEntity(ref, true)),
            Query(() => txn.deleteChangeSet(ref)),
        )
    },
)
