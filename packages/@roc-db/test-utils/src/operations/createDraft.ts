import { Query, writeOperation } from "roc-db"
import { CreateDraftMutationSchema } from "../schemas/CreateDraftMutationSchema"
import { DraftSchema } from "../schemas/DraftSchema"

export const createDraft = writeOperation(
    CreateDraftMutationSchema,
    DraftSchema,
    txn => {
        const ref = txn.createRef("Draft")
        const { postRef } = txn.payload
        return Query(() =>
            txn.createEntity(ref, {
                parents: {
                    post: postRef,
                },
            }),
        )
    },
)
