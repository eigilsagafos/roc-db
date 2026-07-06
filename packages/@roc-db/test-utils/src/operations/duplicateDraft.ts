import {
    type DuplicateChangeSetMutationsResult,
    Query,
    QueryChain,
    writeOperation,
} from "roc-db"
import { z } from "zod"
import { DraftRefSchema } from "../schemas/DraftRefSchema"
import { PostRefSchema } from "../schemas/PostRefSchema"

/**
 * Canonical consumer usage of the `txn.duplicateChangeSetMutations` primitive:
 * create the new draft and copy the source draft's pending mutations into it,
 * all in one transaction.
 */
export const duplicateDraft = writeOperation(
    "duplicateDraft",
    z.object({ sourceRef: DraftRefSchema, postRef: PostRefSchema }).strict(),
    txn => {
        const newDraftRef = txn.createRef("Draft")
        const { sourceRef, postRef } = txn.payload
        return QueryChain(
            Query(() =>
                txn.createEntity(newDraftRef, { parents: { post: postRef } }),
            ),
            Query(() =>
                txn.duplicateChangeSetMutations(sourceRef, newDraftRef),
            ),
            Query(dup => {
                const result = dup as DuplicateChangeSetMutationsResult
                return {
                    draftRef: newDraftRef,
                    mutations: result.mutations,
                    refMap: result.refMap,
                }
            }),
        )
    },
)
