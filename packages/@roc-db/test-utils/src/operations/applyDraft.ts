import { Query, QueryChain, writeOperation } from "roc-db"
import { DraftRefSchema } from "../schemas/DraftRefSchema"

export const applyDraft = writeOperation("applyDraft", DraftRefSchema, txn => {
    const ref = txn.payload
    const versionRef = txn.createRef("PostVersion")
    return QueryChain(
        Query(() => txn.applyChangeSet(ref)),
        Query(() =>
            txn.patchEntity(ref, {
                data: { appliedAt: txn.timestamp },
            }),
        ),
        Query(draft => txn.childRefsOf(draft.parents.post, true)),
        Query((childRefs, draft) =>
            txn.batchReadEntities([draft.parents.post, ...childRefs]),
        ),

        Query((childEntities, _, draft) =>
            txn.createEntity(versionRef, {
                data: {
                    version: 1,
                    snapshot: childEntities,
                },
                parents: {
                    post: draft.parents.post,
                },
            }),
        ),
    )
})
