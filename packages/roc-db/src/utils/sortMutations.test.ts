import { describe, expect, test } from "bun:test"
import { sortMutations } from "./sortMutations"

describe("sortMutations", () => {
    test("if all documents have persistedAt returns oldest first", async () => {
        const res = sortMutations([
            { persistedAt: "2021-01-01T00:00:03Z", ref: "3" },
            { persistedAt: "2021-01-01T00:00:01Z", ref: "1" },
            { persistedAt: "2021-01-01T00:00:02Z", ref: "2" },
        ]).map(mutation => mutation.ref)
        expect(res).toStrictEqual(["1", "2", "3"])
    })

    test("persistedAt should always come before timestamp", async () => {
        const res = sortMutations([
            { timestamp: "2021-01-01T00:00:02Z", ref: "3" },
            { persistedAt: "2021-01-01T00:00:03Z", ref: "1" },
            { timestamp: "2021-01-01T00:00:01Z", ref: "2" },
        ]).map(mutation => mutation.ref)
        expect(res).toStrictEqual(["1", "2", "3"])
    })

    test("timestamps only", async () => {
        const res = sortMutations([
            { timestamp: "2021-01-01T00:00:03Z", ref: "3" },
            { timestamp: "2021-01-01T00:00:01Z", ref: "1" },
            { timestamp: "2021-01-01T00:00:02Z", ref: "2" },
        ]).map(mutation => mutation.ref)
        expect(res).toStrictEqual(["1", "2", "3"])
    })

    test("timestamps equal ref is used secondary", async () => {
        const res = sortMutations([
            { timestamp: "2021-01-01T00:00:01Z", ref: "3" },
            { timestamp: "2021-01-01T00:00:01Z", ref: "1" },
            { timestamp: "2021-01-01T00:00:01Z", ref: "2" },
        ]).map(mutation => mutation.ref)
        expect(res).toStrictEqual(["1", "2", "3"])
    })
})
