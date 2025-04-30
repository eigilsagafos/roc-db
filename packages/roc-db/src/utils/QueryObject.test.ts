import { describe, expect, test } from "bun:test"

import { createInMemoryAdapter } from "@roc-db/in-memory"
import { readOperation } from "../readOperation"
import { z } from "zod"
import { QueryObject } from "./QueryObject"
import { Query } from "./Query"
import { QueryArray } from "./QueryArray"

describe("QueryObject", () => {
    test("one", async () => {
        const adapter = createInMemoryAdapter({
            operations: [
                readOperation("test", z.any(), () => {
                    return QueryObject({
                        number: 1,
                        string: "test",
                        array: [1, 2, 3],
                        query: Query(() => "query"),
                        queryArray: QueryArray([Query(() => "QueryArray0")]),
                        queryObject: QueryObject({ foo: "bar" }),
                    })
                }),
            ],
            entities: [],
            session: { identityRef: "User/1" },
        })

        const res = adapter.test()
        expect(res).toStrictEqual({
            number: 1,
            string: "test",
            array: [1, 2, 3],
            query: "query",
            queryArray: ["QueryArray0"],
            queryObject: { foo: "bar" },
        })
    })
})
