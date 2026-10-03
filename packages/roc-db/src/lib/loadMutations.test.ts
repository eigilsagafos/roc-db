import { operations, entities } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { createInMemoryAdapter } from "@roc-db/in-memory"
import { createIndexedDBAdapter } from "@roc-db/indexed-db"
import { Snowflake } from "../utils/Snowflake"
import { createAdapter } from "../createAdapter"
import * as inMemoryFunctions from "../../../@roc-db/in-memory/src/functions"

const snowflake = new Snowflake(10, 10)

const prepare = () => {
    const adapter1 = createInMemoryAdapter({
        operations,
        entities,
        session: { identityRef: "User/42" },
        snowflake,
    })
    const adapter2 = createIndexedDBAdapter({
        operations,
        entities,
        session: { identityRef: "User/42" },
        snowflake,
        optimistic: true,
    })

    const [post, createPostMutation] = adapter1.createPost({
        title: "Post 1",
    })
    return [adapter1, adapter2, post, createPostMutation]
}

describe("loadMutations", () => {
    test("order does not matter and is sorted by loadMutations", async () => {
        const [adapter1, adapter2, post, createPostMutation] = prepare()
        const [, updateTitleMutation] = adapter1.updatePostTitle({
            ref: post.ref,
            title: "F",
        })
        await adapter2.loadMutations([updateTitleMutation, createPostMutation])

        const postRead = await adapter2.readPost(post.ref)
        expect(postRead.data.title).toBe("F")
    })

    test("loading a mutation that is missing previous mutations crashes", () => {
        const [adapter1, adapter2, post, createPostMutation] = prepare()
        const [, updateTitleMutation] = adapter1.updatePostTitle({
            ref: post.ref,
            title: "F",
        })
        expect(() =>
            adapter2.loadMutations([updateTitleMutation]),
        ).toThrowError()
    })

    test("debounce handled correctly", async () => {
        const [adapter1, adapter2, post, createPostMutation] = prepare()
        await adapter2.loadMutations([createPostMutation])
        const [, updateTitleMutation1] = adapter1.updatePostTitle({
            ref: post.ref,
            title: "F",
        })
        await adapter2.loadMutations([updateTitleMutation1])
        const [, updateTitleMutation2] = adapter1.updatePostTitle({
            ref: post.ref,
            title: "Fo",
        })
        await adapter2.loadMutations([updateTitleMutation2])

        const postRead = await adapter2.readPost(post.ref)
        expect(postRead.data.title).toBe("Fo")
    })

    test("out of order debounce with same timestamp handled correctly", async () => {
        const [adapter1, adapter2, post, createPostMutation] = prepare()
        const [, updateTitleMutation1] = adapter1.updatePostTitle({
            ref: post.ref,
            title: "First",
        })
        const [, updateTitleMutation2] = adapter1.updatePostTitle({
            ref: post.ref,
            title: "Second",
        })
        updateTitleMutation2.timestamp = updateTitleMutation1.timestamp
        await adapter2.loadMutations([createPostMutation])
        await adapter2.loadMutations([
            updateTitleMutation2,
            updateTitleMutation1,
        ])

        const postRead2 = await adapter2.readPost(post.ref)
        expect(postRead2.data.title).toBe("Second")
    })
})

describe("prepareChangeSets", () => {
    // An in-memory adapter that records when the batch hooks run.
    const createRecordingAdapter = (optimistic: boolean, calls: any[]) =>
        createAdapter(
            {
                name: "recording",
                operations,
                entities,
                snowflake,
                optimistic,
                session: { identityRef: "User/42" },
                functions: {
                    ...inMemoryFunctions,
                    prepareChangeSets: (_engineOpts: any, refs: string[]) => {
                        calls.push(["prepareChangeSets", refs])
                    },
                    begin: (engineOpts: any, callback: any) => {
                        calls.push(["begin"])
                        return callback(engineOpts)
                    },
                },
            } as any,
            {
                entities: new Map(),
                mutations: new Map(),
                entitiesUnique: new Map(),
                entitiesIndex: new Map(),
            },
        ) as any

    const prepareChangeSetMutations = () => {
        const source = createInMemoryAdapter({
            operations,
            entities,
            session: { identityRef: "User/42" },
            snowflake,
        })
        const [post] = source.createPost({ title: "Post" })
        const [draft] = source.createDraft({ postRef: post.ref })
        source
            .changeSet(draft.ref)
            .createBlockParagraph({ parentRef: post.ref })
        return { draft, mutations: source.pageMutations({}) }
    }

    test("loadMutations prepares the batch's changeSets before its transaction", () => {
        const { draft, mutations } = prepareChangeSetMutations()
        const calls: any[] = []
        createRecordingAdapter(true, calls).loadMutations(mutations)
        expect(calls[0]).toEqual(["prepareChangeSets", [draft.ref]])
        expect(calls[1]).toEqual(["begin"])
    })

    test("passes every changeSet once and never the root", () => {
        const source = createInMemoryAdapter({
            operations,
            entities,
            session: { identityRef: "User/42" },
            snowflake,
        })
        const [post] = source.createPost({ title: "Post" })
        const rootOnly = source.pageMutations({})
        const [draft1] = source.createDraft({ postRef: post.ref })
        const [draft2] = source.createDraft({ postRef: post.ref })
        for (const draft of [draft1, draft2, draft1]) {
            source
                .changeSet(draft.ref)
                .createBlockParagraph({ parentRef: post.ref })
        }

        const rootCalls: any[] = []
        createRecordingAdapter(true, rootCalls).loadMutations(rootOnly)
        expect(rootCalls[0]).toEqual(["prepareChangeSets", []])

        const calls: any[] = []
        createRecordingAdapter(true, calls).loadMutations(
            source.pageMutations({}),
        )
        expect(calls[0][0]).toBe("prepareChangeSets")
        expect([...calls[0][1]].sort()).toEqual([draft1.ref, draft2.ref].sort())
    })

    test("persistOptimisticMutations prepares the batch's changeSets before its transaction", () => {
        const { draft, mutations } = prepareChangeSetMutations()
        const calls: any[] = []
        createRecordingAdapter(false, calls).persistOptimisticMutations(
            mutations,
        )
        expect(calls[0]).toEqual(["prepareChangeSets", [draft.ref]])
        expect(calls[1]).toEqual(["begin"])
    })
})
