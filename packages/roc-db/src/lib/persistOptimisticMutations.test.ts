import { operations, entities } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { createInMemoryAdapter } from "@roc-db/in-memory"
import { createIndexedDBAdapter } from "@roc-db/indexed-db"
import { Snowflake } from "../utils/Snowflake"

const snowflake = new Snowflake(10, 10)

describe("persistOptimisticMutations", () => {
    test("payload is validated", async () => {
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

        const [, mutation] = adapter1.createPost({ title: "Post 1" })
        mutation.payload.title = 42 // Invalid payload, should be a string
        expect(() =>
            adapter2.persistOptimisticMutations([mutation]),
        ).toThrowError("Payload validation failed")
    })
})
