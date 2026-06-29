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

    test("replays mutations in creation order when changeSet mixes persisted and not-yet-persisted mutations", () => {
        // Scenario: a changeSet contains three mutations where the middle one
        // never got `persistedAt` set (e.g. applyChangeSet runs while the
        // client is offline or before that mutation's sync round-trip lands).
        //   1. createBlockRow   — persisted
        //   2. createBlockParagraph (child of row) — NOT persisted
        //   3. deleteBlocks([row]) — persisted
        //
        // If sort puts persisted ahead of unpersisted, deleteBlocks runs
        // before the paragraph create and the paragraph's readEntity(rowRef)
        // throws "Entity not found".
        const engine = {
            entities: new Map(),
            mutations: new Map(),
            entitiesUnique: new Map(),
            entitiesIndex: new Map(),
        }
        const adapter = createInMemoryAdapter({
            operations: [...operations, applyDraftTest],
            entities,
            session: { identityRef: "User/42" },
            snowflake,
            engine,
        })

        const [post] = adapter.createPost({ title: "Post 1" })
        const [draft] = adapter.createDraft({ postRef: post.ref })

        const draftAdapter = adapter.changeSet(draft.ref)

        const [{ block: row }, rowMutation] = draftAdapter.createBlockRow({
            parentRef: post.ref,
        })

        draftAdapter.createBlockParagraph({
            parentRef: row.ref,
            content: "Hello world",
        })

        const [, deleteMutation] = draftAdapter.deleteBlocks([row.ref])

        // Simulate sync responses landing after all three local mutations have
        // been authored: the row's persistedAt is later than the paragraph's
        // timestamp, mirroring the real `persistOptimisticMutations` path which
        // stamps persistedAt with wall-clock time at persist receipt.
        const syncedAt = new Date().toISOString()
        engine.mutations.set(rowMutation.ref, {
            ...engine.mutations.get(rowMutation.ref),
            persistedAt: syncedAt,
        })
        engine.mutations.set(deleteMutation.ref, {
            ...engine.mutations.get(deleteMutation.ref),
            persistedAt: syncedAt,
        })

        expect(() => adapter.applyDraftTest(draft.ref)).not.toThrow()
    })
})
