import { describe, expect, test } from "bun:test"
import { z } from "zod"
import type { Operation } from "../types/Operation"
import { writeOperation } from "../writeOperation"
import { DuplicateOperationError } from "../errors/DuplicateOperationError"
import { assertUniqueOperations } from "./assertUniqueOperations"

const op = (name: string, version?: number) =>
    writeOperation(
        name,
        z.any(),
        () => {},
        version === undefined ? {} : { version },
    )

describe("assertUniqueOperations", () => {
    test("passes when every (name, version) is distinct", () => {
        expect(() =>
            assertUniqueOperations([op("a"), op("b"), op("a", 2)]),
        ).not.toThrow()
    })

    test("allows the same name at different versions", () => {
        expect(() =>
            assertUniqueOperations([op("a", 1), op("a", 2), op("a", 3)]),
        ).not.toThrow()
    })

    test("throws DuplicateOperationError on a repeated (name, version)", () => {
        let err: any
        try {
            assertUniqueOperations([op("a", 1), op("b"), op("a", 1)])
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(DuplicateOperationError)
        expect(err.operationName).toBe("a")
        expect(err.version).toBe(1)
    })

    test("treats a default-version op as version 1 (collides with explicit 1)", () => {
        // writeOperation defaults version to 1.
        expect(() => assertUniqueOperations([op("a"), op("a", 1)])).toThrow(
            DuplicateOperationError,
        )
    })

    test("keys an operation with no version field at version 1", () => {
        const versionless = { type: "read", name: "r" } as unknown as Operation
        expect(() =>
            assertUniqueOperations([versionless, versionless]),
        ).toThrow(/version 1/)
    })
})
