import { createInMemoryAdapter } from "@roc-db/in-memory"
import { entities } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { Snowflake } from "../utils/Snowflake"
import { writeOperation } from "../writeOperation"

const snowflake = new Snowflake(10, 10)

describe("createRef", () => {
    test("createRef adds to log", async () => {
        const textRefCreation = writeOperation(
            "testRefCreation",
            z.any(),
            txn => {
                const postRef = txn.createRef("Post")
                const userRef = txn.createRef("User")
                txn.createEntity(userRef, { data: { email: "foo@bar.baz" } })
                txn.createEntity(postRef, {
                    data: { title: "Fish", tags: [] },
                    children: { blocks: [] },
                })
            },
        )

        const adapter1 = createInMemoryAdapter({
            operations: [textRefCreation],
            entities,
            session: { identityRef: "User/42" },
            snowflake,
        })
        const adapter2 = createInMemoryAdapter({
            operations: [textRefCreation],
            entities,
            session: { identityRef: "User/42" },
            snowflake,
        })

        const [res, mutation1] = adapter1.testRefCreation()

        const [[, mutation2]] = adapter2.loadMutations([mutation1])
        expect(mutation2).toStrictEqual(mutation1)
    })

    test("creating refs that are not consumed throws error", async () => {
        const textRefCreation = writeOperation(
            "testRefCreation",
            z.any(),
            txn => {
                const postRef = txn.createRef("Post")
                const userRef = txn.createRef("User")
                txn.createEntity(userRef, { data: { email: "foo@bar.baz" } })
            },
        )

        const adapter1 = await createInMemoryAdapter({
            operations: [textRefCreation],
            entities,
            session: { identityRef: "User/42" },
            snowflake,
        })

        expect(() => adapter1.testRefCreation()).toThrow(
            /A ref 'Post\/.+' was created but not used/,
        )
    })
})
