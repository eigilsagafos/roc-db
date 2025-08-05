import { describe, expect, test } from "bun:test"
import { refSchemaGenerator } from "./refSchemaGenerator"

const Ref = refSchemaGenerator("Post")

describe("entitySchemaGenerator", () => {
    test("Works for valid ref", () => {
        expect(() => Ref.parse("Post/123")).not.toThrowError()
    })
    test("Fails when id is not a number", () => {
        expect(() => Ref.parse("Post/aaa")).toThrowError("Invalid input")
    })
    test("Fails when id is a float", () => {
        expect(() => Ref.parse("Post/123.123")).toThrowError("Invalid input")
    })
    test("Fails when / is missing", () => {
        expect(() => Ref.parse("Post123")).toThrowError("Invalid input")
    })
    test("Supports multiple entites", () => {
        const UnionRef = refSchemaGenerator("Post", "User", "Comment")
        UnionRef.parse("Post/123")
        UnionRef.parse("User/123")
        expect(() => UnionRef.parse("Missing/123")).toThrowError(
            "Invalid input",
        )
    })
})
