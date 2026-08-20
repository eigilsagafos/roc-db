import { describe, expect, test } from "bun:test"
import type { Mutation } from "../types/Mutation"
import { filterAndPageMutations } from "./filterAndPageMutations"
import { normalizePageMutationsArgs } from "./normalizePageMutationsArgs"

const mutation = (id: string, timestamp: string): Mutation =>
    ({
        ref: `Mutation/${id}`,
        timestamp,
        operation: { name: "createPost", version: 1 },
        payload: {},
        log: [],
        debounceCount: 0,
        identityRef: "User/1",
        sessionRef: null,
        persistedAt: timestamp,
    }) as Mutation

const page = (mutations: Mutation[], args: any = {}) =>
    filterAndPageMutations(mutations, normalizePageMutationsArgs(args)).map(
        m => m.ref,
    )

describe("filterAndPageMutations ordering", () => {
    // Snowflake ids are stored as decimal text and gain a digit over time, so
    // a lexical comparison flips as soon as the log spans that boundary. Both
    // the JS comparator and the postgres `id::numeric` cast exist for this.
    const SHORT = "999999999999999999999" // 21 digits
    const LONG = "1000000000000000000000" // 22 digits, but numerically larger
    const TIED = "2026-01-01T00:00:00.000Z"

    test("ties on timestamp break on the numeric id, newest first", () => {
        expect(
            page([mutation(SHORT, TIED), mutation(LONG, TIED)]),
        ).toStrictEqual([`Mutation/${LONG}`, `Mutation/${SHORT}`])
    })

    test("timestamp wins over id", () => {
        expect(
            page([
                mutation(LONG, "2026-01-01T00:00:00.000Z"),
                mutation(SHORT, "2026-01-02T00:00:00.000Z"),
            ]),
        ).toStrictEqual([`Mutation/${SHORT}`, `Mutation/${LONG}`])
    })

    test("the keyset cursor skips exactly the rows already seen", () => {
        const mutations = [
            mutation(SHORT, TIED),
            mutation(LONG, TIED),
            mutation("1", "2025-01-01T00:00:00.000Z"),
        ]
        // Paging with size 1 from the top must not repeat or drop the tied row.
        expect(
            page(mutations, {
                size: 1,
                before: TIED,
                beforeRef: `Mutation/${LONG}`,
            }),
        ).toStrictEqual([`Mutation/${SHORT}`])
    })

    test("without the tiebreak, `before` drops the whole tied timestamp", () => {
        const mutations = [mutation(SHORT, TIED), mutation(LONG, TIED)]
        expect(page(mutations, { before: TIED })).toStrictEqual([])
    })
})
