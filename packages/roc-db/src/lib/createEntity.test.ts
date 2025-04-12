import { operations, entities } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { createInMemoryAdapter } from "@roc-db/in-memory"
import { createIndexedDBAdapter } from "@roc-db/indexed-db"
import { Snowflake } from "../utils/Snowflake"
import { createEntity } from "./createEntity"
import { BadRequestError } from "../errors/BadRequestError"

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

const geneateFakeTransaction = () => {
    return {
        mutation: { ref: "Mutation/1234" },
        changeSet: { entities: new Map() },
        adapter: {
            validEntities: new Set(["Post"]),
        },
        createRef: entity => {
            return `${entity}/12345`
        },
    }
}

describe.skip("createEntity", () => {
    test("createEntity with valid ref works", async () => {
        const txn = geneateFakeTransaction()
        const res = createEntity(txn, "Post/1", { data: { bar: "baz" } })
        expect(res.ref).toBe("Post/1")
    })
    test("createEntity with valid enity works", async () => {
        const txn = geneateFakeTransaction()
        const res = createEntity(txn, "Post", { data: { bar: "baz" } })
        expect(res.ref).toBe("Post/12345")
    })
    test("createEntity with invalid enity fails", async () => {
        const txn = geneateFakeTransaction()
        expect(() =>
            createEntity(txn, "Foo", { data: { bar: "baz" } }),
        ).toThrow(BadRequestError)
    })
    test("createEntity with invalid ref fails", async () => {
        const txn = geneateFakeTransaction()
        expect(() =>
            createEntity(txn, "Foo/2", { data: { bar: "baz" } }),
        ).toThrow(BadRequestError)
    })
})
