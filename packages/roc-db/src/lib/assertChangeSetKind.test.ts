import { createInMemoryAdapter } from "@roc-db/in-memory"
import { entities, operations } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { NotAChangeSetError } from "../errors/NotAChangeSetError"
import { NotAVersionError } from "../errors/NotAVersionError"
import { Query } from "../utils/Query"
import { Snowflake } from "../utils/Snowflake"
import { writeOperation } from "../writeOperation"

// Loosely-typed duplicate op so a non-changeSet ref can reach the guardrail
// (a DraftRefSchema-typed payload would reject it at parse time first).
const dupLoose = writeOperation("dupLoose", z.any(), (txn: any) =>
    Query(() =>
        txn.duplicateChangeSetMutations(txn.payload.source, txn.payload.target),
    ),
)

const makeAdapter = () =>
    // duplicateChangeSetMutations is server-authoritative (rejects optimistic
    // adapters), so exercise its guardrails on a non-optimistic adapter.
    createInMemoryAdapter({
        operations: [...operations, dupLoose],
        entities,
        session: { identityRef: "User/42" },
        snowflake: new Snowflake(10, 10),
        optimistic: false,
    })

describe("changeSet-kind guardrail", () => {
    test("throws NotAChangeSetError when a non-changeSet ref is used as a changeSetRef", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        let err: any
        try {
            adapter.changeSet(post.ref)
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(NotAChangeSetError)
        expect(err.entityKind).toBe("Post")
        expect(err.changeSetRef).toBe(post.ref)
    })

    test("a declared changeSet (Draft) is accepted", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        expect(() => adapter.changeSet(draft.ref)).not.toThrow()
    })

    test("duplicateChangeSetMutations guards its source/target", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        let err: any
        try {
            // source is a Post (not a changeSet) -> guardrail rejects it.
            adapter.dupLoose({ source: post.ref, target: draft.ref })
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(NotAChangeSetError)
        expect(err.entityKind).toBe("Post")
    })

    test("loadChangeSetBase rejects a version parent that is not a version entity", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        // A changeSet (Draft) whose version parent points at a Post, not a
        // version entity — the base can't be resolved from it.
        adapter._engineOpts.entities.set("Draft/700000000000", {
            ref: "Draft/700000000000",
            entity: "Draft",
            created: {
                mutationRef: "Mutation/1",
                timestamp: "2020-01-01T00:00:00.000Z",
            },
            updated: {
                mutationRef: "Mutation/1",
                timestamp: "2020-01-01T00:00:00.000Z",
            },
            data: {},
            parents: { post: post.ref, version: post.ref },
            children: {},
            ancestors: {},
        })
        const [target] = adapter.createDraft({ postRef: post.ref })
        let err: any
        try {
            adapter.dupLoose({
                source: "Draft/700000000000",
                target: target.ref,
            })
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(NotAVersionError)
        expect(err.entityKind).toBe("Post")
    })
})
