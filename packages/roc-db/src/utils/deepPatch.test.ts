import { describe, test, expect } from "bun:test"
import { deepPatch } from "./deepPatch"

describe("deepPatch", () => {
    test("null deletes key", () => {
        const original = { foo: "bar" }
        const patch = { foo: null }
        const res = deepPatch(original, patch)
        expect(res).toEqual({})
    })

    test("different type", () => {
        const res = deepPatch({ foo: "bar" }, 1234)
        expect(res).toEqual(1234)
    })
    test("add nested object", () => {
        const res = deepPatch({ foo: "bar" }, { nested: { bar: "baz" } })
        expect(res).toEqual({ foo: "bar", nested: { bar: "baz" } })
    })
})
