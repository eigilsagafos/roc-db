import { describe, expect, test } from "bun:test"
import { Snowflake } from "./Snowflake"

describe("Snowflake", () => {
    test("parse", () => {
        const snowflake = new Snowflake(1, 1)
        const ts = Date.now()
        const id1 = snowflake.generate(ts)
        const id2 = snowflake.generate(ts)
        const res1 = snowflake.parse(id1)
        const res2 = snowflake.parse(id2)
        expect(res1).toStrictEqual([ts, 1, 1, 0])
        expect(res2).toStrictEqual([ts, 1, 1, 1])
    })
})
