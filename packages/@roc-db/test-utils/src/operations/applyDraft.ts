import { Query, QueryChain, writeOperation } from "roc-db"
import { ApplyDraftMutationSchema } from "../schemas/ApplyDraftMutationSchema"

export const applyDraft = writeOperation(
    ApplyDraftMutationSchema,
    undefined,
    txn => {
        const { ref } = txn.payload
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
            Query(childEntities =>
                txn.createEntity(versionRef, {
                    data: {
                        snapshot: childEntities,
                    },
                }),
            ),
        )
    },
)
