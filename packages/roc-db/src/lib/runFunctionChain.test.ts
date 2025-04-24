import { describe, expect, test } from "bun:test"
import { QueryChain } from "../utils/QueryChain"
import { Query } from "../utils/Query"
import { QueryObject } from "../utils/QueryObject"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { runSyncFunctionChain } from "./runSyncFunctionChain"
describe("runFunctionChain", () => {
    test("Fishy", async () => {
        const query = QueryChain(
            Query(() => {}),
            Query(() => {
                return QueryObject({
                    a: Query(() => 1),
                    b: Query(() => 2),
                })
            }),
        )
        const syncRes = runSyncFunctionChain(query)
        expect(syncRes).toStrictEqual({ a: 1, b: 2 })
        const asyncRes = await runAsyncFunctionChain(query)
        expect(asyncRes).toStrictEqual({ a: 1, b: 2 })
    })
})
