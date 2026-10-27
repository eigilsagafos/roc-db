import { describe, expect, test } from "bun:test"
import type { Mutation } from "../types/Mutation"
import { findDebounceTarget } from "./debounce"

const now = new Date("2026-01-01T00:00:10.000Z")
const request = {
    operation: { name: "updateTitle", debounce: 10 },
    payload: { ref: "Post/1" },
    changeSetRef: "Draft/1",
} as any

const mutation = (id: number, overrides: Partial<Mutation> = {}): Mutation =>
    ({
        ref: `Mutation/${id}`,
        timestamp: "2026-01-01T00:00:05.000Z",
        operation: { name: "updateTitle", version: 1 },
        payload: { ref: "Post/1" },
        log: [],
        changeSetRef: "Draft/1",
        debounceCount: 0,
        identityRef: "User/A",
        sessionRef: null,
        persistedAt: null,
        ...overrides,
    }) as Mutation

describe("findDebounceTarget", () => {
    test("merges into the latest mutation", () => {
        const target = mutation(2)
        expect(
            findDebounceTarget(request, [mutation(1), target], now, "User/A"),
        ).toBe(target)
    })

    test("a mutation persisted later blocks the merge even if it was written earlier", () => {
        const target = mutation(1, {
            persistedAt: "2026-01-01T00:00:05.000Z",
        })
        const offline = mutation(2, {
            operation: { name: "createBlock", version: 1 },
            timestamp: "2026-01-01T00:00:01.000Z",
            persistedAt: "2026-01-01T00:00:06.000Z",
        })
        expect(
            findDebounceTarget(request, [target, offline], now, "User/A"),
        ).toBeUndefined()
    })

    test("equal timestamps fall back to the id", () => {
        const target = mutation(1)
        const sameMillisecond = mutation(2, {
            operation: { name: "createBlock", version: 1 },
        })
        expect(
            findDebounceTarget(
                request,
                [target, sameMillisecond],
                now,
                "User/A",
            ),
        ).toBeUndefined()
    })

    test("another identity's write in another changeSet does not block the merge", () => {
        const target = mutation(1)
        const elsewhere = mutation(2, {
            changeSetRef: "Draft/2",
            identityRef: "User/B",
            timestamp: "2026-01-01T00:00:06.000Z",
        })
        expect(
            findDebounceTarget(request, [target, elsewhere], now, "User/A"),
        ).toBe(target)
    })

    test("a mutation outside the window is not merged into", () => {
        const old = mutation(1, { timestamp: "2025-12-31T23:59:59.000Z" })
        expect(
            findDebounceTarget(request, [old], now, "User/A"),
        ).toBeUndefined()
    })
})
