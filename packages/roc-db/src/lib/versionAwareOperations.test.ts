import { createInMemoryAdapter } from "@roc-db/in-memory"
import {
    DraftRefSchema,
    PostRefSchema,
    entities,
    operations,
} from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { DuplicateOperationError } from "../errors/DuplicateOperationError"
import { pageEntities } from "../operations/pageEntities"
import { pageMutations } from "../operations/pageMutations"
import { redo } from "../operations/redo"
import { undo } from "../operations/undo"
import { Query } from "../utils/Query"
import { Snowflake } from "../utils/Snowflake"
import { writeOperation } from "../writeOperation"

// Two versions of the same operation. Each stamps the title with a marker so a
// replay reveals which version's callback actually ran.
const setTitlePayload = z.object({ ref: PostRefSchema, title: z.string() })

const setTitleV1 = writeOperation(
    "setTitle",
    setTitlePayload,
    txn =>
        Query(() =>
            txn.patchEntity(txn.payload.ref, {
                data: { title: `${txn.payload.title} (v1)` },
            }),
        ),
    { version: 1 },
)

const setTitleV2 = writeOperation(
    "setTitle",
    setTitlePayload,
    txn =>
        Query(() =>
            txn.patchEntity(txn.payload.ref, {
                data: { title: `${txn.payload.title} (v2)` },
            }),
        ),
    { version: 2 },
)

// Minimal operation that applies a Draft changeSet onto root.
const applyDraftChangeSet = writeOperation(
    "applyDraftChangeSet",
    DraftRefSchema,
    txn => Query(() => txn.applyChangeSet(txn.payload)),
)

// Copies a source changeSet's pending mutations into an (empty) target. This is
// the rebase/replay primitive; it resolves each source operation through the
// same version-aware findOperation as apply/initialize.
const duplicateInto = writeOperation(
    "duplicateInto",
    z.object({ sourceRef: DraftRefSchema, targetRef: DraftRefSchema }).strict(),
    txn =>
        Query(() =>
            txn.duplicateChangeSetMutations(
                txn.payload.sourceRef,
                txn.payload.targetRef,
            ),
        ),
)

const newEngine = () => ({
    entities: new Map(),
    mutations: new Map(),
    entitiesUnique: new Map(),
    entitiesIndex: new Map(),
})

describe("version-aware operations", () => {
    test("a changeSet authored with v1 replays as v1 after v2 is added, while new writes use v2", () => {
        // A single engine shared across two adapter "releases": the changeSet
        // mutation authored by release 1 is still present when release 2 reads
        // and applies it.
        const engine = newEngine()
        const snowflake = new Snowflake(10, 10)

        // --- Release 1: only setTitle v1 exists ---
        const appV1 = createInMemoryAdapter({
            operations: [...operations, setTitleV1, applyDraftChangeSet],
            entities,
            session: { identityRef: "User/42" },
            snowflake,
            engine,
        })

        const [post] = appV1.createPost({ title: "Original" })
        const [draft] = appV1.createDraft({ postRef: post.ref })

        // Author a mutation inside the changeSet — recorded at version 1.
        const draftV1 = appV1.changeSet(draft.ref)
        const [, changeSetMutation] = draftV1.setTitle({
            ref: post.ref,
            title: "Edited",
        })
        expect(changeSetMutation.operation.version).toBe(1)

        // --- Release 2: setTitle v2 added; v1 kept so history still replays ---
        // v2 is registered BEFORE v1 on purpose: a name-only lookup (the old
        // behavior) would return the first "setTitle" it finds (v2), so every
        // "(v1)" assertion below would still pass under the bug. Registering v2
        // first makes those assertions real regression guards — they only hold
        // if resolution is genuinely version-aware / max-version.
        const appV2 = createInMemoryAdapter({
            operations: [
                ...operations,
                setTitleV2,
                setTitleV1,
                applyDraftChangeSet,
            ],
            entities,
            session: { identityRef: "User/42" },
            snowflake,
            engine, // same underlying data as release 1
        })

        // New writes resolve to the latest version (v2) even though v2 is listed
        // first — selection is by max version, not array order.
        const [post2] = appV2.createPost({ title: "Second" })
        const [, directMutation] = appV2.setTitle({
            ref: post2.ref,
            title: "Fresh",
        })
        expect(directMutation.operation.version).toBe(2)
        expect(appV2.readPost(post2.ref).data.title).toBe("Fresh (v2)")

        // Reading inside the changeSet rebuilds it (initializeChangeSet), which
        // replays the v1-authored mutation with the v1 callback.
        const draftV2 = appV2.changeSet(draft.ref)
        expect(draftV2.readPost(post.ref).data.title).toBe("Edited (v1)")
        // Root stays untouched until the changeSet is applied.
        expect(appV2.readPost(post.ref).data.title).toBe("Original")

        // Applying the changeSet replays the v1 mutation onto root; it must run
        // v1 even though v2 is now the latest registered version.
        appV2.applyDraftChangeSet(draft.ref)
        expect(appV2.readPost(post.ref).data.title).toBe("Edited (v1)")
    })

    test("replaying a mutation whose authored version is no longer registered throws", () => {
        // If release 2 drops v1 instead of keeping it, the v1-authored mutation
        // can't be safely replayed — running v2's logic could corrupt data — so
        // findOperation refuses rather than silently using a different version.
        const engine = newEngine()
        const snowflake = new Snowflake(11, 11)

        const appV1 = createInMemoryAdapter({
            operations: [...operations, setTitleV1, applyDraftChangeSet],
            entities,
            session: { identityRef: "User/42" },
            snowflake,
            engine,
        })

        const [post] = appV1.createPost({ title: "Original" })
        const [draft] = appV1.createDraft({ postRef: post.ref })
        appV1.changeSet(draft.ref).setTitle({ ref: post.ref, title: "Edited" })

        // Release 2 registers ONLY v2 — v1 is gone.
        const appV2 = createInMemoryAdapter({
            operations: [...operations, setTitleV2, applyDraftChangeSet],
            entities,
            session: { identityRef: "User/42" },
            snowflake,
            engine,
        })

        expect(() => appV2.applyDraftChangeSet(draft.ref)).toThrow(
            /Operation "setTitle" version 1 not found/,
        )
    })

    test("duplicating a v1-authored changeSet after v2 is added preserves the authored version", () => {
        // duplicateChangeSetMutations is the rebase/replay primitive and is
        // server-authoritative (rejects optimistic adapters), so both releases
        // run with optimistic: false.
        const engine = newEngine()
        const snowflake = new Snowflake(12, 12)

        // Release 1 authors a changeSet mutation at version 1.
        const appV1 = createInMemoryAdapter({
            operations: [...operations, setTitleV1],
            entities,
            session: { identityRef: "User/42" },
            snowflake,
            engine,
            optimistic: false,
        })
        const [post] = appV1.createPost({ title: "Original" })
        const [source] = appV1.createDraft({ postRef: post.ref })
        appV1.changeSet(source.ref).setTitle({ ref: post.ref, title: "Edited" })

        // Release 2 adds v2 (registered before v1, as a guard) and duplicates.
        const appV2 = createInMemoryAdapter({
            operations: [...operations, setTitleV2, setTitleV1, duplicateInto],
            entities,
            session: { identityRef: "User/42" },
            snowflake,
            engine,
            optimistic: false,
        })
        const [target] = appV2.createDraft({ postRef: post.ref })

        const [{ mutations: copies }] = appV2.duplicateInto({
            sourceRef: source.ref,
            targetRef: target.ref,
        })

        // The copy carries the SOURCE's authored version, not the latest — so it
        // keeps replaying as v1.
        const setTitleCopy = copies.find(
            (m: any) => m.operation.name === "setTitle",
        )
        expect(setTitleCopy.operation.version).toBe(1)

        // End-to-end: reading the duplicated changeSet replays the copy, which
        // must resolve to v1 (would be "Edited (v2)" under a name-only lookup
        // with v2 registered first).
        expect(appV2.changeSet(target.ref).readPost(post.ref).data.title).toBe(
            "Edited (v1)",
        )
    })
})

describe("duplicate operation registration", () => {
    test("throws when the same name and version is registered twice", () => {
        expect(() =>
            createInMemoryAdapter({
                operations: [setTitleV1, setTitleV1],
                entities,
                session: { identityRef: "User/42" },
            }),
        ).toThrow(DuplicateOperationError)
    })

    test("does not throw for the same name at different versions", () => {
        expect(() =>
            createInMemoryAdapter({
                operations: [setTitleV1, setTitleV2],
                entities,
                session: { identityRef: "User/42" },
            }),
        ).not.toThrow()
    })

    test("clone() and changeSet() re-run construction without false-positiving", () => {
        // The uniqueness guard runs on every construction; re-running it via
        // clone()/changeSet() on a valid multi-version list must not throw.
        const adapter = createInMemoryAdapter({
            operations: [...operations, setTitleV2, setTitleV1],
            entities,
            session: { identityRef: "User/42" },
        })
        expect(() => adapter.clone()).not.toThrow()

        const [post] = adapter.createPost({ title: "P" })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        expect(() => adapter.changeSet(draft.ref)).not.toThrow()
    })
})

describe("built-in operations are opt-in", () => {
    test("an adapter exposes no built-ins unless they are registered", () => {
        const adapter = createInMemoryAdapter({
            operations: [],
            entities,
            session: { identityRef: "User/42" },
        }) as any
        expect(adapter.undo).toBeUndefined()
        expect(adapter.redo).toBeUndefined()
        expect(adapter.pageMutations).toBeUndefined()
        expect(adapter.pageEntities).toBeUndefined()
    })

    test("registering the built-ins explicitly exposes them", () => {
        const adapter = createInMemoryAdapter({
            operations: [pageMutations, pageEntities, undo, redo],
            entities,
            session: { identityRef: "User/42" },
        }) as any
        expect(typeof adapter.undo).toBe("function")
        expect(typeof adapter.redo).toBe("function")
        expect(typeof adapter.pageMutations).toBe("function")
        expect(typeof adapter.pageEntities).toBe("function")
    })

    test("pageEntities filters by the `entities` kind list", () => {
        // Guards the payload<->adapter contract: the `entities` filter must be
        // honored (the old include/exclude payload was silently dropped).
        const adapter = createInMemoryAdapter({
            operations,
            entities,
            session: { identityRef: "User/42" },
        }) as any
        const [post] = adapter.createPost({ title: "P" })
        adapter.createDraft({ postRef: post.ref })

        const onlyPosts = adapter.pageEntities({ entities: ["Post"] })
        expect(onlyPosts.length).toBe(1)
        expect(onlyPosts.every((doc: any) => doc.entity === "Post")).toBe(true)

        const kinds = new Set(
            adapter.pageEntities({ entities: "*" }).map((d: any) => d.entity),
        )
        expect(kinds.has("Post")).toBe(true)
        expect(kinds.has("Draft")).toBe(true)
    })
})
