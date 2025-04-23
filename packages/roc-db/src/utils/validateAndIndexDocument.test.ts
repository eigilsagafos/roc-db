import { test } from "bun:test"
import { describe } from "bun:test"
import { validateAndIndexDocument } from "./validateAndIndexDocument"
import { z } from "zod"
import { Entity } from "../Entity"
import { expect } from "bun:test"

const model = new Entity("Person", {
    data: z.object({}),
    parents: z.object({
        string: z.string().optional(),
        array: z.array(z.string().optional()).optional(),
    }),
    children: z.object({
        string: z.string().optional(),
        array: z.array(z.string().optional()).optional(),
    }),
    ancestors: z.object({
        string: z.string().optional(),
        array: z.array(z.string().optional()).optional(),
    }),
})

describe("validateAndIndexDocument", () => {
    test("undefined in parents throws error", () => {
        const timestamp = new Date().toISOString()
        const doc = {
            ref: "Person/12345",
            entity: "Person",
            created: { timestamp, mutationRef: "Mutation/12345" },
            updated: { timestamp, mutationRef: "Mutation/12345" },
            data: {},
            children: {},
            ancestors: {},
            parents: {},
        }
        expect(() =>
            validateAndIndexDocument(model, {
                ...doc,
                parents: { string: undefined },
            }),
        ).toThrowError("Object cannot contain undefined values")
        expect(() =>
            validateAndIndexDocument(model, {
                ...doc,
                parents: { array: [undefined] },
            }),
        ).toThrowError("Object cannot contain undefined values")
    })
    test("undefined in children throws error", () => {
        const timestamp = new Date().toISOString()
        const doc = {
            ref: "Person/12345",
            entity: "Person",
            created: { timestamp, mutationRef: "Mutation/12345" },
            updated: { timestamp, mutationRef: "Mutation/12345" },
            data: {},
            children: {},
            ancestors: {},
            parents: {},
        }
        expect(() =>
            validateAndIndexDocument(model, {
                ...doc,
                children: { string: undefined },
            }),
        ).toThrowError("Object cannot contain undefined values")
        expect(() =>
            validateAndIndexDocument(model, {
                ...doc,
                children: { array: [undefined] },
            }),
        ).toThrowError("Object cannot contain undefined values")
    })
})
