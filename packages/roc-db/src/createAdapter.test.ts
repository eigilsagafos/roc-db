import { describe, expect, test } from "bun:test"
import { createInMemoryAdapter } from "@roc-db/in-memory"
import { entities, operations } from "@roc-db/test-utils"

describe.skip("writeOperation", () => {
    test("should create a read operation", async () => {
        const optimisticAdapter = createInMemoryAdapter({
            entities,
            operations,
            optimistic: true,
            session: { identityRef: "User/42" },
        })
        const persistentAdapter = createInMemoryAdapter({
            entities,
            operations,
            optimistic: false,
            session: { identityRef: "User/42" },
        })
        const [, optimisticMut] = optimisticAdapter.createPost({
            title: "Foo",
            tags: [],
        })

        expect(optimisticMut.persistedAt).toBe(undefined)
        const res = persistentAdapter.persistOptimisticMutations([
            optimisticMut,
        ])
        expect(res[0].persistedAt).toBeDefined()
        expect(res[0].persistedAt).toBeTypeOf("string")

        // expect()
    })
})
