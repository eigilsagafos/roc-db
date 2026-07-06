import { createInMemoryAdapter } from "@roc-db/in-memory"
import { entities } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { Entity } from "../Entity"
import { NotAVersionError } from "../errors/NotAVersionError"
import { refSchemaGenerator } from "../schemas/generators/refSchemaGenerator"
import { entityKindsFromRefSchema } from "../utils/entityKindsFromRefSchema"

describe("entityKindsFromRefSchema", () => {
    test("recovers the kinds a ref schema accepts", () => {
        expect(
            entityKindsFromRefSchema(refSchemaGenerator("PostVersion")),
        ).toEqual(["PostVersion"])
        expect(entityKindsFromRefSchema(refSchemaGenerator("A", "B"))).toEqual([
            "A",
            "B",
        ])
        // tag lives on the inner schema; unwrap optional to find it
        expect(
            entityKindsFromRefSchema(
                refSchemaGenerator("PostVersion").optional(),
            ),
        ).toEqual(["PostVersion"])
        // generic / unknown schemas yield no kinds (checks are skipped)
        expect(entityKindsFromRefSchema(refSchemaGenerator())).toEqual([])
        expect(entityKindsFromRefSchema(z.string())).toEqual([])
    })
})

describe("validateChangeSetVersionParents", () => {
    // A changeSet whose version parent points at a Post (not a version entity).
    const BadDraft = new Entity("BadDraft", {
        changeSet: true,
        data: z.object({ appliedAt: z.string().optional() }),
        parents: z.object({ version: refSchemaGenerator("Post") }),
    })

    test("well-formed entities (Draft.version -> PostVersion) construct without error", () => {
        expect(() =>
            createInMemoryAdapter({
                operations: [],
                entities,
                session: { identityRef: "User/42" },
            }),
        ).not.toThrow()
    })

    test("a version parent pointing at a non-version entity throws at construction", () => {
        expect(() =>
            createInMemoryAdapter({
                operations: [],
                entities: [...entities, BadDraft] as any,
                session: { identityRef: "User/42" },
            }),
        ).toThrow(NotAVersionError)
    })
})
