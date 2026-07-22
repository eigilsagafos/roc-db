import { describe, expect, test } from "bun:test"
import { z } from "zod"
import type { Mutation } from "../types/Mutation"
import type { WriteOperation } from "../types/WriteOperation"
import { writeOperation } from "../writeOperation"
import { findOperation } from "./findOperation"

// findOperation only reads `operation.{name,version}` off the mutation, so a
// minimal stub is enough and keeps the version explicit per case.
const mutationFor = (name: string, version?: number) =>
    ({
        operation: version === undefined ? { name } : { name, version },
    }) as unknown as Mutation

const v1 = writeOperation("op", z.any(), () => {}, { version: 1 })
const v2 = writeOperation("op", z.any(), () => {}, { version: 2 })
const other = writeOperation("other", z.any(), () => {})

describe("findOperation", () => {
    test("matches on both name and version", () => {
        const operations = [v1, v2, other] as WriteOperation[]
        expect(findOperation(operations, mutationFor("op", 1))).toBe(v1)
        expect(findOperation(operations, mutationFor("op", 2))).toBe(v2)
    })

    test("is independent of registration order", () => {
        const operations = [v2, v1] as WriteOperation[]
        expect(findOperation(operations, mutationFor("op", 1))).toBe(v1)
        expect(findOperation(operations, mutationFor("op", 2))).toBe(v2)
    })

    test("defaults a mutation with no recorded version to version 1", () => {
        // Backwards compatibility: mutations authored before `version` existed,
        // and the mutation schema itself, default the field to 1.
        const operations = [v1, v2] as WriteOperation[]
        expect(findOperation(operations, mutationFor("op"))).toBe(v1)
    })

    test("throws a version-specific error when the version is not registered", () => {
        const operations = [v1] as WriteOperation[]
        expect(() => findOperation(operations, mutationFor("op", 2))).toThrow(
            /Operation "op" version 2 not found/,
        )
    })

    test("throws a name error when the operation is unknown", () => {
        const operations = [v1, v2] as WriteOperation[]
        expect(() =>
            findOperation(operations, mutationFor("missing", 1)),
        ).toThrow(/Operation "missing" not found/)
    })
})
