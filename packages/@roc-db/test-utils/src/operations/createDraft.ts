import { Query, writeOperation } from "roc-db"
import { DraftSchema } from "../schemas/DraftSchema"
import { z } from "zod"
import { PostRefSchema } from "../schemas"

export const createDraft = writeOperation(
    "createDraft",
    z.object({ postRef: PostRefSchema }).strict(),
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
    { outputSchema: DraftSchema },
)
