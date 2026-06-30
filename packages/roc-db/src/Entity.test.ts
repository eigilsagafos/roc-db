import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { Entity } from "./Entity"

describe("Entity changeSet/version flags", () => {
    test("a plain entity is neither a changeSet nor a version", () => {
        const e = new Entity("Plain", { data: z.object({ x: z.string() }) })
        expect(e.changeSet).toBe(false)
        expect(e.version).toBe(false)
    })

    test("changeSet requires an appliedAt data field", () => {
        expect(
            () =>
                new Entity("Draft", {
                    changeSet: true,
                    data: z.object({ appliedAt: z.string().optional() }),
                }),
        ).not.toThrow()
        expect(
            () =>
                new Entity("BadDraft", {
                    changeSet: true,
                    data: z.object({ other: z.string() }),
                }),
        ).toThrow(/appliedAt/)
    })

    test("changeSet cannot also be a singleton or a version", () => {
        expect(
            () =>
                new Entity("X", {
                    changeSet: true,
                    singleton: true,
                    data: z.object({ appliedAt: z.string().optional() }),
                }),
        ).toThrow(/singleton\/version/)
        expect(
            () =>
                new Entity("Y", {
                    changeSet: true,
                    version: true,
                    data: z.object({
                        appliedAt: z.string().optional(),
                        snapshot: z.array(z.any()),
                    }),
                }),
        ).toThrow(/singleton\/version/)
    })

    test("version requires a snapshot data field", () => {
        const v = new Entity("PostVersion", {
            version: true,
            data: z.object({ version: z.number(), snapshot: z.array(z.any()) }),
        })
        expect(v.version).toBe(true)
        expect(v.changeSet).toBe(false)
        expect(
            () =>
                new Entity("BadVersion", {
                    version: true,
                    data: z.object({ version: z.number() }),
                }),
        ).toThrow(/snapshot/)
    })
})
