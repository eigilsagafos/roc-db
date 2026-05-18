import { describe, expect, test } from "bun:test"
import { sortMutations } from "./sortMutations"

describe("sortMutations", () => {
    test("sorts by timestamp ascending", async () => {
        const res = sortMutations([
            { timestamp: "2021-01-01T00:00:03Z", ref: "3" },
            { timestamp: "2021-01-01T00:00:01Z", ref: "1" },
            { timestamp: "2021-01-01T00:00:02Z", ref: "2" },
        ]).map(mutation => mutation.ref)
        expect(res).toStrictEqual(["1", "2", "3"])
    })

    test("ties on timestamp fall back to ref", async () => {
        const res = sortMutations([
            { timestamp: "2021-01-01T00:00:01Z", ref: "3" },
            { timestamp: "2021-01-01T00:00:01Z", ref: "1" },
            { timestamp: "2021-01-01T00:00:01Z", ref: "2" },
        ]).map(mutation => mutation.ref)
        expect(res).toStrictEqual(["1", "2", "3"])
    })

    test("ignores persistedAt, even when it would reorder against timestamp", async () => {
        // Realistic scenario: mutation 1 is created first, then 2 is created
        // locally before 1's sync completes, then 1's persistedAt arrives with
        // a wall-clock time later than 2's timestamp. Sort must still respect
        // authorship order (timestamp), not persistence order.
        const res = sortMutations([
            {
                ref: "2",
                timestamp: "2021-01-01T00:00:02.000Z",
            },
            {
                ref: "1",
                timestamp: "2021-01-01T00:00:01.000Z",
                persistedAt: "2021-01-01T00:00:05.000Z",
            },
            {
                ref: "3",
                timestamp: "2021-01-01T00:00:03.000Z",
                persistedAt: "2021-01-01T00:00:05.000Z",
            },
        ]).map(mutation => mutation.ref)
        expect(res).toStrictEqual(["1", "2", "3"])
    })
})
