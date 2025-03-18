import { Query, writeOperation } from "roc-db"
import { DraftSchema } from "../schemas/DraftSchema"
import { ApplyDraftMutationSchema } from "../schemas/ApplyDraftMutationSchema"

export const applyDraft = writeOperation(
    ApplyDraftMutationSchema,
    undefined,
    txn => {
        // const ref = txn.createRef("Draft")
        const { ref } = txn.payload
        return Query(() => txn.applyChangeSet(ref))
    },
)
