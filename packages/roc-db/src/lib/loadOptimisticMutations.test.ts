import { operations, entities } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { createInMemoryAdapter } from "@roc-db/in-memory"
import { createIndexedDBAdapter } from "@roc-db/indexed-db"
import { Snowflake } from "../utils/Snowflake"

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
    })

    const [post, createPostMutation] = adapter1.createPost({
        title: "Post 1",
    })
    return [adapter1, adapter2, post, createPostMutation]
}

describe("loadOptimisticMutations", () => {
    test("order does not matter and is sorted by loadOptimisticMutations", async () => {
        const [adapter1, adapter2, post, createPostMutation] = prepare()
        const [, updateTitleMutation] = adapter1.updatePostTitle({
            ref: post.ref,
            title: "F",
        })
        await adapter2.loadOptimisticMutations([
            updateTitleMutation,
            createPostMutation,
        ])

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
            adapter2.loadOptimisticMutations([updateTitleMutation]),
        ).toThrowError()
    })

    test("debounce handled correctly", async () => {
        const [adapter1, adapter2, post, createPostMutation] = prepare()
        await adapter2.loadOptimisticMutations([createPostMutation])
        const [, updateTitleMutation1] = adapter1.updatePostTitle({
            ref: post.ref,
            title: "F",
        })
        await adapter2.loadOptimisticMutations([updateTitleMutation1])
        const [, updateTitleMutation2] = adapter1.updatePostTitle({
            ref: post.ref,
            title: "Fo",
        })
        await adapter2.loadOptimisticMutations([updateTitleMutation2])

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
        await adapter2.loadOptimisticMutations([createPostMutation])
        await adapter2.loadOptimisticMutations([
            updateTitleMutation2,
            updateTitleMutation1,
        ])

        const postRead2 = await adapter2.readPost(post.ref)
        expect(postRead2.data.title).toBe("Second")
    })
})
