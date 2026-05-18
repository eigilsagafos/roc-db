import { describe, expect, test } from "bun:test"
import { sortMutations } from "./sortMutations"

describe("sortMutations", () => {
    test("when all mutations are persisted, sorts by persistedAt", async () => {
        const res = sortMutations([
            {
                ref: "3",
                timestamp: "2021-01-01T00:00:01Z",
                persistedAt: "2021-01-01T00:00:30Z",
            },
            {
                ref: "1",
                timestamp: "2021-01-01T00:00:03Z",
                persistedAt: "2021-01-01T00:00:10Z",
            },
            {
                ref: "2",
                timestamp: "2021-01-01T00:00:02Z",
                persistedAt: "2021-01-01T00:00:20Z",
            },
        ]).map(mutation => mutation.ref)
        expect(res).toStrictEqual(["1", "2", "3"])
    })

    test("when any mutation is unpersisted, sorts by timestamp", async () => {
        const res = sortMutations([
            { ref: "3", timestamp: "2021-01-01T00:00:03Z" },
            { ref: "1", timestamp: "2021-01-01T00:00:01Z" },
            { ref: "2", timestamp: "2021-01-01T00:00:02Z" },
        ]).map(mutation => mutation.ref)
        expect(res).toStrictEqual(["1", "2", "3"])
    })

    test("ties on the sort key fall back to ref", async () => {
        const res = sortMutations([
            { ref: "3", timestamp: "2021-01-01T00:00:01Z" },
            { ref: "1", timestamp: "2021-01-01T00:00:01Z" },
            { ref: "2", timestamp: "2021-01-01T00:00:01Z" },
        ]).map(mutation => mutation.ref)
        expect(res).toStrictEqual(["1", "2", "3"])
    })

    test("mixed set ignores persistedAt entirely, sorts the persisted ones by their timestamp", async () => {
        // The realistic optimistic-apply scenario: mutation 1 was authored
        // first and its sync round-trip stamped persistedAt with wall-clock
        // time *after* mutation 2 was authored locally. Sort must still
        // respect authorship order — `persistedAt` is irrelevant when any
        // mutation in the set is unpersisted.
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
