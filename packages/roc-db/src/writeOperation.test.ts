import { describe, expect, test } from "bun:test"
import { inMemoryAdapter } from "@roc-db/test-utils"

describe("writeOperation", () => {
    test("should create a read operation", async () => {
        const [post1] = inMemoryAdapter.createPost({ title: "Foo", tags: [] })
    })

    test("debounce", () => {
        const [post1, mu] = inMemoryAdapter.createPost({ title: "F", tags: [] })
        const [post1Update1, updateMutation1] = inMemoryAdapter.updatePostTitle(
            {
                ref: post1.ref,
                title: "Fo",
            },
        )
        expect(updateMutation1.identityRef).toBe("User/42")
        const [post1Update2, updateMutation2] = inMemoryAdapter.updatePostTitle(
            {
                ref: post1.ref,
                title: "Foo",
            },
        )
        expect(updateMutation2.debounceCount).toBe(1)
    })
})
