import { describe, expect, test } from "bun:test"
import { BadRequestError } from "../errors/BadRequestError"
import { normalizePageMutationsArgs } from "./normalizePageMutationsArgs"

describe("normalizePageMutationsArgs", () => {
    test("no args", () => {
        expect(normalizePageMutationsArgs()).toStrictEqual({
            // Unbounded at this layer: the `pageMutations` *operation* applies
            // the size-30 default before the adapter is ever reached, so a
            // direct `txn.pageMutations()` caller keeps the historic
            // full-table behaviour.
            size: null,
            changeSet: "any",
            before: null,
            operationName: null,
            identityRef: null,
            logRefs: null,
        })
    })

    describe("changeSet", () => {
        test("tri-state", () => {
            expect(
                normalizePageMutationsArgs({ changeSet: "any" }).changeSet,
            ).toBe("any")
            expect(
                normalizePageMutationsArgs({ changeSet: "none" }).changeSet,
            ).toBe("none")
            expect(
                normalizePageMutationsArgs({ changeSet: "Draft/1" }).changeSet,
            ).toBe("Draft/1")
        })

        test("legacy changeSetRef maps onto it", () => {
            expect(
                normalizePageMutationsArgs({ changeSetRef: "Draft/1" })
                    .changeSet,
            ).toBe("Draft/1")
        })

        test("legacy changeSetRef: null keeps meaning no filter", () => {
            // Historic behaviour. Reinterpreting it as "root only" would turn
            // any caller threading a nullable ref into a silent subset.
            expect(
                normalizePageMutationsArgs({ changeSetRef: null }).changeSet,
            ).toBe("any")
        })

        test("null is a hard error, not a silent widening", () => {
            expect(() =>
                normalizePageMutationsArgs({ changeSet: null as any }),
            ).toThrow(BadRequestError)
        })

        test("both spellings at once is a hard error", () => {
            expect(() =>
                normalizePageMutationsArgs({
                    changeSet: "none",
                    changeSetRef: "Draft/1",
                }),
            ).toThrow(BadRequestError)
        })

        test("`changeSet` plus a null `changeSetRef` is not a conflict", () => {
            expect(
                normalizePageMutationsArgs({
                    changeSet: "none",
                    changeSetRef: null,
                }).changeSet,
            ).toBe("none")
        })

        test("a bare kind is not a ref", () => {
            // "Draft" or a typo'd "nnone" would otherwise be accepted as a
            // change-set ref that matches nothing.
            expect(() =>
                normalizePageMutationsArgs({ changeSet: "Draft" as any }),
            ).toThrow(BadRequestError)
            expect(() =>
                normalizePageMutationsArgs({ changeSet: "nnone" as any }),
            ).toThrow(BadRequestError)
        })
    })

    describe("before", () => {
        test("timestamp only", () => {
            expect(
                normalizePageMutationsArgs({
                    before: "2026-01-01T00:00:00.000Z",
                }).before,
            ).toStrictEqual({
                timestamp: "2026-01-01T00:00:00.000Z",
                ref: null,
            })
        })

        test("with a tiebreak ref", () => {
            expect(
                normalizePageMutationsArgs({
                    before: "2026-01-01T00:00:00.000Z",
                    beforeRef: "Mutation/12",
                }).before,
            ).toStrictEqual({
                timestamp: "2026-01-01T00:00:00.000Z",
                ref: "Mutation/12",
            })
        })

        test("beforeRef alone is an error", () => {
            expect(() =>
                normalizePageMutationsArgs({ beforeRef: "Mutation/12" }),
            ).toThrow(BadRequestError)
        })

        test("an unparseable timestamp is an error", () => {
            expect(() =>
                normalizePageMutationsArgs({ before: "yesterday" }),
            ).toThrow(BadRequestError)
        })
    })

    describe("scalar-or-array predicates", () => {
        test("scalars widen to arrays", () => {
            const res = normalizePageMutationsArgs({
                operationName: "createPost",
                identityRef: "User/1",
                logRefs: "Post/1",
            })
            expect(res.operationName).toStrictEqual(["createPost"])
            expect(res.identityRef).toStrictEqual(["User/1"])
            expect(res.logRefs).toStrictEqual(["Post/1"])
        })

        test("an empty array is an error, not a match-nothing filter", () => {
            expect(() =>
                normalizePageMutationsArgs({ operationName: [] }),
            ).toThrow(BadRequestError)
            expect(() => normalizePageMutationsArgs({ logRefs: [] })).toThrow(
                BadRequestError,
            )
        })
    })

    describe("size", () => {
        test("null is unbounded", () => {
            expect(normalizePageMutationsArgs({ size: null }).size).toBeNull()
        })

        test("rejects zero, negatives and fractions", () => {
            for (const size of [0, -1, 1.5]) {
                expect(() => normalizePageMutationsArgs({ size })).toThrow(
                    BadRequestError,
                )
            }
        })
    })
})
