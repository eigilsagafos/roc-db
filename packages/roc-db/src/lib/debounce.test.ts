import { describe, expect, test } from "bun:test"
import type { Mutation } from "../types/Mutation"
import { findDebounceTarget, rebaseDebouncedVersion } from "./debounce"
import { Snowflake } from "../utils/Snowflake"

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
            findDebounceTarget(
                request,
                [mutation(1), target],
                now,
                "User/A",
                false,
            ),
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
            findDebounceTarget(
                request,
                [target, offline],
                now,
                "User/A",
                false,
            ),
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
                false,
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
            findDebounceTarget(
                request,
                [target, elsewhere],
                now,
                "User/A",
                false,
            ),
        ).toBe(target)
    })

    test("a mutation outside the window is not merged into", () => {
        const old = mutation(1, { timestamp: "2025-12-31T23:59:59.000Z" })
        expect(
            findDebounceTarget(request, [old], now, "User/A", false),
        ).toBeUndefined()
    })

    test("on a client, the identity's later write anywhere blocks the merge", () => {
        const target = mutation(1)
        const elsewhere = mutation(2, {
            operation: { name: "createBlock", version: 1 },
            changeSetRef: null,
            timestamp: "2026-01-01T00:00:06.000Z",
        })
        expect(
            findDebounceTarget(
                request,
                [target, elsewhere],
                now,
                "User/A",
                true,
            ),
        ).toBeUndefined()
        expect(
            findDebounceTarget(
                request,
                [target, elsewhere],
                now,
                "User/A",
                false,
            ),
        ).toBe(target)
    })

    test("on a client, the identity's write persisted later but written earlier does not block", () => {
        const target = mutation(1, { persistedAt: "2026-01-01T00:00:05.000Z" })
        const synced = mutation(2, {
            operation: { name: "createBlock", version: 1 },
            changeSetRef: "Draft/2",
            timestamp: "2026-01-01T00:00:01.000Z",
            persistedAt: "2026-01-01T00:00:06.000Z",
        })
        expect(
            findDebounceTarget(request, [target, synced], now, "User/A", true),
        ).toBe(target)
    })

    test("at root, another identity's later write blocks the merge", () => {
        const rootRequest = { ...request, changeSetRef: null }
        const target = mutation(1, { changeSetRef: null })
        const other = mutation(2, {
            operation: { name: "createPost", version: 1 },
            changeSetRef: null,
            identityRef: "User/B",
            timestamp: "2026-01-01T00:00:06.000Z",
        })
        for (const optimistic of [true, false]) {
            expect(
                findDebounceTarget(
                    rootRequest,
                    [target, other],
                    now,
                    "User/A",
                    optimistic,
                ),
            ).toBeUndefined()
        }
    })

    test("of several matching rows, only the latest can be the target", () => {
        const rootRequest = { ...request, changeSetRef: null }
        const earlier = mutation(1, { changeSetRef: null })
        const later = mutation(2, {
            changeSetRef: null,
            timestamp: "2026-01-01T00:00:06.000Z",
        })
        expect(
            findDebounceTarget(
                rootRequest,
                [later, earlier],
                now,
                "User/A",
                false,
            ),
        ).toBe(later)
    })
})

describe("rebaseDebouncedVersion", () => {
    const adapter = { snowflake: new Snowflake(1, 1) }
    const operation = request.operation
    const existing = mutation(1, { persistedAt: "2026-01-01T00:00:05.000Z" })
    const refiled = mutation(3, {
        timestamp: "2026-01-01T00:00:07.000Z",
        persistedAt: "2026-01-01T00:00:08.000Z",
        payload: { ref: "Post/1", title: "v2" },
        sessionRef: "Session/1",
    } as any)
    const version = (overrides: any) => ({
        ...existing,
        timestamp: "2026-01-01T00:00:07.000Z",
        payload: { ref: "Post/1", title: "v2" },
        debounceCount: 1,
        sessionRef: "Session/1",
        ...overrides,
    })

    test("skips a resend of a version re-filed for the same session", () => {
        expect(
            rebaseDebouncedVersion(adapter, operation, version({}), existing, [
                existing,
                refiled,
            ]),
        ).toBeNull()
    })

    test("does not skip an identical version from another session", () => {
        expect(
            rebaseDebouncedVersion(
                adapter,
                operation,
                version({ sessionRef: "Session/2" }),
                existing,
                [existing, refiled],
            ),
        ).not.toBeNull()
    })
})
