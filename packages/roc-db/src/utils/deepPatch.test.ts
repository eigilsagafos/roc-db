import { describe, test, expect } from "bun:test"
import { deepPatch } from "./deepPatch"

describe("deepPatch", () => {
    test("null deletes key", () => {
        const original = { foo: "bar" }
        const patch = { foo: null }
        const [res, reversePatch] = deepPatch(original, patch)
        expect(res).toEqual({})
        const [restored, reverseRestore] = deepPatch(res, reversePatch)
        expect(restored).toEqual(original)
        expect(reverseRestore).toEqual(patch)
    })

    test("different type", () => {
        const original = { foo: "bar" }
        const patch = 1234
        const [updated, reversePatch] = deepPatch(original, patch)
        expect(updated).toEqual(1234)
        expect(reversePatch).toEqual({ foo: "bar" })

        const [restored, reverseRestore] = deepPatch(updated, reversePatch)
        expect(restored).toEqual(original)
        expect(reverseRestore).toEqual(patch)
    })
    test("add nested object", () => {
        const original = { foo: "bar" }
        const patch = {
            nested: { bar: "baz" },
            fish: { other: { nested: 1223 } },
        }
        const [res, reversePatch] = deepPatch(original, patch)
        expect(res).toEqual({
            foo: "bar",
            nested: { bar: "baz" },
            fish: { other: { nested: 1223 } },
        })
        const [restored, reverseRestore] = deepPatch(res, reversePatch)
        expect(restored).toEqual(original)
        expect(reverseRestore).toEqual(patch)
    })

    test("equal docs", () => {
        const original = { foo: 1, obj: { nested: "bar" }, arr: [1, 2, 3] }
        const patch = { foo: 1, arr: [1, 2, 3] }
        const [res, reversePatch] = deepPatch(original, patch)
        expect(res).toEqual(original)
        expect(reversePatch).toEqual(undefined)
        const [restored, reverseRestore] = deepPatch(res, reversePatch)
        expect(restored).toEqual(original)
        expect(reverseRestore).toEqual(undefined)
    })
})
