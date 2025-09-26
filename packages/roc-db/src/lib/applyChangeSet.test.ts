import { createInMemoryAdapter } from "@roc-db/in-memory"
import { DraftRefSchema, entities, operations } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { Query } from "../utils/Query"
import { QueryChain } from "../utils/QueryChain"
import { Snowflake } from "../utils/Snowflake"
import { writeOperation } from "../writeOperation"

const snowflake = new Snowflake(10, 10)

export const applyDraftTest = writeOperation(
    "applyDraftTest",
    DraftRefSchema,
    txn => {
        const ref = txn.payload
        // const versionRef = txn.createRef("PostVersion")
        let postRef
        return QueryChain(
            Query(() => txn.readEntity(ref)),
            Query(draft => {
                postRef = draft.parents.post
                return txn.readEntity(postRef)
            }),
            Query((post, draft) => {
                console.log("draft", draft)
                return txn.applyChangeSet(ref)
            }),
            Query((_, post) => txn.readEntity(postRef)),
            Query(() =>
                txn.patchEntity(ref, {
                    data: { appliedAt: txn.timestamp },
                }),
            ),
            Query((_, readPostAfter, applyRes, post, draft) => {
                return {
                    readPostBefore: post,
                    readPostAfter,
                }
            }),
        )
    },
)

describe("applyChangeSet", () => {
    test("Test that the changeSet (Cache) on a txn is leveraged", async () => {
        const adapter1 = createInMemoryAdapter({
            operations: [...operations, applyDraftTest],
            entities,
            session: { identityRef: "User/42" },
            snowflake,
        })

        const [post] = adapter1.createPost({ title: "Post 1" })
        const [draft] = adapter1.createDraft({ postRef: post.ref })
        // console.log(draft)

        const draftAdapter = adapter1.changeSet(draft.ref)
        const [block] = draftAdapter.createBlockParagraph({
            parentRef: post.ref,
            content: "Hello world",
        })
        const [{ readPostBefore, readPostAfter }, mutation] =
            adapter1.applyDraftTest(draft.ref)
        expect(readPostBefore.children.blocks).toHaveLength(0)
        expect(readPostAfter.children.blocks).toHaveLength(1)
    })
})
