import { describe, expect, test } from "bun:test"
import { sortMutations } from "./sortMutations"

describe("sortMutations", () => {
    test("when all mutations are persisted, sorts by persistedAt", async () => {
        const res = sortMutations([
            {
                ref: "Mutation/1063354369557194121217",
                timestamp: "2021-01-01T00:00:01Z",
                persistedAt: "2021-01-01T00:00:30Z",
            },
            {
                ref: "Mutation/1063354369557194121218",
                timestamp: "2021-01-01T00:00:03Z",
                persistedAt: "2021-01-01T00:00:10Z",
            },
            {
                ref: "Mutation/1063354369557194121219",
                timestamp: "2021-01-01T00:00:02Z",
                persistedAt: "2021-01-01T00:00:20Z",
            },
        ]).map(mutation => mutation.persistedAt)
        expect(res).toStrictEqual([
            "2021-01-01T00:00:10Z",
            "2021-01-01T00:00:20Z",
            "2021-01-01T00:00:30Z",
        ])
    })

    test("when any mutation is unpersisted, sorts by timestamp", async () => {
        const res = sortMutations([
            {
                ref: "Mutation/1063354369557194121217",
                timestamp: "2021-01-01T00:00:03Z",
            },
            {
                ref: "Mutation/1063354369557194121218",
                timestamp: "2021-01-01T00:00:01Z",
            },
            {
                ref: "Mutation/1063354369557194121219",
                timestamp: "2021-01-01T00:00:02Z",
            },
        ]).map(mutation => mutation.timestamp)
        expect(res).toStrictEqual([
            "2021-01-01T00:00:01Z",
            "2021-01-01T00:00:02Z",
            "2021-01-01T00:00:03Z",
        ])
    })

    test("ties on the sort key fall back to numeric id (creation order), not lexical", async () => {
        // All three share one persistedAt (e.g. a batch persisted in a single
        // persistOptimisticMutations call). The tiebreak must order by the
        // numeric snowflake id. These ids differ in decimal length, so a
        // lexical compare would put "10…" before "9…" — wrong.
        const persistedAt = "2021-01-01T00:00:00Z"
        const res = sortMutations([
            { ref: "Mutation/10000000000000000000", persistedAt },
            { ref: "Mutation/9000000000000000000", persistedAt },
            { ref: "Mutation/9500000000000000000", persistedAt },
        ]).map(mutation => mutation.ref)
        expect(res).toStrictEqual([
            "Mutation/9000000000000000000",
            "Mutation/9500000000000000000",
            "Mutation/10000000000000000000",
        ])
    })

    test("mixed set ignores persistedAt entirely, sorts by timestamp", async () => {
        // The realistic optimistic-apply scenario: mutation 1 was authored
        // first and its sync round-trip stamped persistedAt with wall-clock
        // time *after* mutation 2 was authored locally. Sort must still
        // respect authorship order — `persistedAt` is irrelevant when any
        // mutation in the set is unpersisted.
        const res = sortMutations([
            {
                ref: "Mutation/1063354369557194121218",
                timestamp: "2021-01-01T00:00:02.000Z",
            },
            {
                ref: "Mutation/1063354369557194121217",
                timestamp: "2021-01-01T00:00:01.000Z",
                persistedAt: "2021-01-01T00:00:05.000Z",
            },
            {
                ref: "Mutation/1063354369557194121219",
                timestamp: "2021-01-01T00:00:03.000Z",
                persistedAt: "2021-01-01T00:00:05.000Z",
            },
        ]).map(mutation => mutation.timestamp)
        expect(res).toStrictEqual([
            "2021-01-01T00:00:01.000Z",
            "2021-01-01T00:00:02.000Z",
            "2021-01-01T00:00:03.000Z",
        ])
    })
})
