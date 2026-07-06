import { createInMemoryAdapter } from "@roc-db/in-memory"
import { DraftRefSchema, entities, operations } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { BadRequestError } from "../errors/BadRequestError"
import { ChangeSetIntegrityError } from "../errors/ChangeSetIntegrityError"
import { ChangeSetNotEmptyError } from "../errors/ChangeSetNotEmptyError"
import { NotFoundError } from "../errors/NotFoundError"
import { SingletonDuplicationError } from "../errors/SingletonDuplicationError"
import { entityFromRef } from "../utils/entityFromRef"
import { Query } from "../utils/Query"
import { QueryChain } from "../utils/QueryChain"
import { Snowflake } from "../utils/Snowflake"
import { sortMutations } from "../utils/sortMutations"
import { writeOperation } from "../writeOperation"

// Minimal apply op: apply the changeSet onto its base, then mark it applied.
const applyDraftTest = writeOperation("applyDraftTest", DraftRefSchema, txn => {
    const ref = txn.payload
    return QueryChain(
        Query(() => txn.applyChangeSet(ref)),
        Query(() =>
            txn.patchEntity(ref, { data: { appliedAt: txn.timestamp } }),
        ),
    )
})

// Consumer ops exercising the txn primitive with an explicit (pre-created)
// target, so tests can drive the hooks / guards directly.
const PayloadSchema = z
    .object({ sourceRef: DraftRefSchema, targetRef: DraftRefSchema })
    .strict()
const duplicateInto = writeOperation("duplicateInto", PayloadSchema, txn =>
    Query(() =>
        txn.duplicateChangeSetMutations(
            txn.payload.sourceRef,
            txn.payload.targetRef,
        ),
    ),
)
const duplicateIntoKeepRows = writeOperation(
    "duplicateIntoKeepRows",
    PayloadSchema,
    txn =>
        Query(() =>
            txn.duplicateChangeSetMutations(
                txn.payload.sourceRef,
                txn.payload.targetRef,
                { filter: m => m.operation.name === "createBlockRow" },
            ),
        ),
)
const duplicateIntoDropRows = writeOperation(
    "duplicateIntoDropRows",
    PayloadSchema,
    txn =>
        Query(() =>
            txn.duplicateChangeSetMutations(
                txn.payload.sourceRef,
                txn.payload.targetRef,
                { filter: m => m.operation.name !== "createBlockRow" },
            ),
        ),
)
const duplicateIntoTag = writeOperation(
    "duplicateIntoTag",
    PayloadSchema,
    txn =>
        Query(() =>
            txn.duplicateChangeSetMutations(
                txn.payload.sourceRef,
                txn.payload.targetRef,
                {
                    transformPayload: (payload: any) =>
                        typeof payload?.content === "string"
                            ? { ...payload, content: payload.content + "!" }
                            : payload,
                },
            ),
        ),
)

// transformPayload that rewrites refs embedded *inside* a string field — the
// case the generic value-remap cannot catch (and the reason transformPayload
// exists). The same embedded refs also live in log reverse/delete blobs.
const duplicateIntoRewriteEmbedded = writeOperation(
    "duplicateIntoRewriteEmbedded",
    PayloadSchema,
    txn =>
        Query(() =>
            txn.duplicateChangeSetMutations(
                txn.payload.sourceRef,
                txn.payload.targetRef,
                {
                    transformPayload: (payload: any, refMap) => {
                        if (typeof payload?.content !== "string") return payload
                        let content = payload.content
                        for (const [oldRef, newRef] of refMap) {
                            content = content.replaceAll(
                                oldRef,
                                newRef as string,
                            )
                        }
                        return { ...payload, content }
                    },
                },
            ),
        ),
)

// transformPayload that returns a payload violating the operation schema
// (parentRef must be a ref string, not a number).
const duplicateIntoBadTransform = writeOperation(
    "duplicateIntoBadTransform",
    PayloadSchema,
    txn =>
        Query(() =>
            txn.duplicateChangeSetMutations(
                txn.payload.sourceRef,
                txn.payload.targetRef,
                {
                    transformPayload: (payload: any) => ({
                        ...payload,
                        parentRef: 123,
                    }),
                },
            ),
        ),
)

// Keeps everything except updateBlockParagraph mutations — used to drop a
// mutation whose *ref* is referenced by a kept `undo` payload.
const duplicateIntoDropUpdates = writeOperation(
    "duplicateIntoDropUpdates",
    PayloadSchema,
    txn =>
        Query(() =>
            txn.duplicateChangeSetMutations(
                txn.payload.sourceRef,
                txn.payload.targetRef,
                { filter: m => m.operation.name !== "updateBlockParagraph" },
            ),
        ),
)

// Operation whose payload schema applies a default. Used to check that a
// transformPayload output the schema legally normalizes (here: fills in a
// defaulted field) is accepted, not rejected for differing from the raw output.
const tagPostDefault = writeOperation(
    "tagPostDefault",
    z.object({ ref: z.string(), tags: z.array(z.string()).default([]) }).strict(),
    txn => {
        const { ref, tags } = txn.payload
        return Query(() => txn.patchEntity(ref, { data: { tags } }))
    },
)
// Drops `tags`; the schema's `.default([])` restores it, so the parsed payload
// differs from the transform output.
const dupStripTags = writeOperation("dupStripTags", PayloadSchema, txn =>
    Query(() =>
        txn.duplicateChangeSetMutations(
            txn.payload.sourceRef,
            txn.payload.targetRef,
            {
                transformPayload: (p: any) => {
                    const { tags, ...rest } = p
                    return rest
                },
            },
        ),
    ),
)

const localOps = [
    applyDraftTest,
    duplicateInto,
    duplicateIntoKeepRows,
    duplicateIntoDropRows,
    duplicateIntoDropUpdates,
    duplicateIntoTag,
    duplicateIntoRewriteEmbedded,
    duplicateIntoBadTransform,
    tagPostDefault,
    dupStripTags,
]

const makeEngine = () => ({
    entities: new Map(),
    mutations: new Map(),
    entitiesUnique: new Map(),
    entitiesIndex: new Map(),
})

const makeAdapter = ({
    engine = makeEngine(),
    session = { identityRef: "User/42" },
    snowflake = new Snowflake(10, 10),
}: {
    engine?: ReturnType<typeof makeEngine>
    session?: any
    snowflake?: Snowflake
} = {}) =>
    createInMemoryAdapter({
        operations: [...operations, ...localOps],
        entities,
        session,
        snowflake,
        engine,
    })

// Source changeSet: a Post (base) + a BlockRow created in the changeSet + a
// BlockParagraph child of that row (cross-reference between two created refs).
const seedSource = (adapter: any, post: any) => {
    const [draft] = adapter.createDraft({ postRef: post.ref })
    const cs = adapter.changeSet(draft.ref)
    const [{ block: row }] = cs.createBlockRow({ parentRef: post.ref })
    const [{ block: para }] = cs.createBlockParagraph({
        parentRef: row.ref,
        content: "Hello",
    })
    return { draftRef: draft.ref, rowRef: row.ref, paraRef: para.ref }
}

const changeSetMutations = (adapter: any, changeSetRef: string) =>
    sortMutations(
        [...adapter._engineOpts.mutations.values()].filter(
            (m: any) => m.changeSetRef === changeSetRef,
        ),
    )

const TS = "2020-01-01T00:00:00.000Z"
const makeDoc = (ref: string, entity: string, rest: any) => ({
    ref,
    entity,
    created: { mutationRef: "Mutation/1", timestamp: TS },
    updated: { mutationRef: "Mutation/1", timestamp: TS },
    data: {},
    children: {},
    parents: {},
    ancestors: {},
    ...rest,
})

describe("duplicateChangeSetMutations", () => {
    test("remaps every created ref to a distinct new ref with no overlap", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef, paraRef } = seedSource(adapter, post)

        const [{ refMap }] = adapter.duplicateDraft({
            sourceRef: draftRef,
            postRef: post.ref,
        })

        expect(refMap.has(rowRef)).toBe(true)
        expect(refMap.has(paraRef)).toBe(true)
        expect(refMap.has(post.ref)).toBe(false) // base ref untouched
        const newRow = refMap.get(rowRef)
        const newPara = refMap.get(paraRef)
        expect(newRow).not.toBe(rowRef)
        expect(newPara).not.toBe(paraRef)
        expect(newRow).not.toBe(newPara)
        expect(entityFromRef(newRow)).toBe(entityFromRef(rowRef))
        expect(entityFromRef(newPara)).toBe(entityFromRef(paraRef))
        const sourceRefs = new Set([rowRef, paraRef])
        for (const v of refMap.values()) expect(sourceRefs.has(v)).toBe(false)
    })

    test("orders each mutation after the mutation that creates its referenced ref", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef, paraRef } = seedSource(adapter, post)

        const [{ mutations, refMap }] = adapter.duplicateDraft({
            sourceRef: draftRef,
            postRef: post.ref,
        })

        const sorted = sortMutations(mutations)
        const createIndex = (ref: string) =>
            sorted.findIndex((m: any) =>
                m.log.some((e: any[]) => e[1] === "create" && e[0] === ref),
            )
        expect(createIndex(refMap.get(paraRef))).toBeGreaterThan(
            createIndex(refMap.get(rowRef)),
        )
        expect(createIndex(refMap.get(rowRef))).toBeGreaterThanOrEqual(0)
    })

    test("orders correctly across 3 levels of nesting (A <- B <- C)", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        const cs = adapter.changeSet(draft.ref)
        const [{ block: a }] = cs.createBlockRow({ parentRef: post.ref })
        const [{ block: b }] = cs.createBlockRow({ parentRef: a.ref })
        const [{ block: c }] = cs.createBlockRow({ parentRef: b.ref })

        const [{ mutations, refMap }] = adapter.duplicateDraft({
            sourceRef: draft.ref,
            postRef: post.ref,
        })

        const sorted = sortMutations(mutations)
        const createIndex = (ref: string) =>
            sorted.findIndex((m: any) =>
                m.log.some((e: any[]) => e[1] === "create" && e[0] === ref),
            )
        const ia = createIndex(refMap.get(a.ref))
        const ib = createIndex(refMap.get(b.ref))
        const ic = createIndex(refMap.get(c.ref))
        expect(ia).toBeGreaterThanOrEqual(0)
        expect(ib).toBeGreaterThan(ia)
        expect(ic).toBeGreaterThan(ib)
    })

    test("applying both source and the duplicate onto the same base succeeds", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef, paraRef } = seedSource(adapter, post)

        const [{ draftRef: newDraftRef, refMap }] = adapter.duplicateDraft({
            sourceRef: draftRef,
            postRef: post.ref,
        })

        expect(() => adapter.applyDraftTest(draftRef)).not.toThrow()
        expect(() => adapter.applyDraftTest(newDraftRef)).not.toThrow()

        const finalPost = adapter.readEntity(post.ref)
        expect(finalPost.children.blocks).toContain(rowRef)
        expect(finalPost.children.blocks).toContain(refMap.get(rowRef))
        expect(finalPost.children.blocks).toHaveLength(2)
        for (const ref of [
            rowRef,
            paraRef,
            refMap.get(rowRef),
            refMap.get(paraRef),
        ]) {
            expect(() => adapter.readEntity(ref)).not.toThrow()
        }
    })

    test("filter excludes the intended mutations", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef, paraRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })

        const [{ mutations, refMap }] = adapter.duplicateIntoKeepRows({
            sourceRef: draftRef,
            targetRef: target.ref,
        })
        expect(mutations).toHaveLength(1)
        expect(refMap.has(rowRef)).toBe(true)
        expect(refMap.has(paraRef)).toBe(false)
    })

    test("filtering out a depended-on create throws ChangeSetIntegrityError", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })

        let err: any
        try {
            adapter.duplicateIntoDropRows({
                sourceRef: draftRef,
                targetRef: target.ref,
            })
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(ChangeSetIntegrityError)
        expect(err.danglingRef).toBe(rowRef)
    })

    test("filtering out a mutation a kept undo depends on throws ChangeSetIntegrityError", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        const cs = adapter.changeSet(draft.ref)
        // A paragraph is created, then updated, then the update is undone. The
        // undo's payload is the update mutation's ref, and its log touches only
        // the paragraph (created by a *kept* mutation) — so nothing the undo
        // depends on is a dropped *entity*, only a dropped *mutation*. (The old
        // integrity check reasoned about entity refs only and missed this.)
        const [{ block: para }] = cs.createBlockParagraph({
            parentRef: post.ref,
            content: "Hello",
        })
        const [, updateMutation] = cs.updateBlockParagraph({
            ref: para.ref,
            content: "Updated",
        })
        cs.undo(updateMutation.ref)
        const [target] = adapter.createDraft({ postRef: post.ref })

        let err: any
        try {
            // drop the update (keeping the undo that points at it)
            adapter.duplicateIntoDropUpdates({
                sourceRef: draft.ref,
                targetRef: target.ref,
            })
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(ChangeSetIntegrityError)
        expect(err.danglingRef).toBe(updateMutation.ref)
    })

    test("transformPayload output is what gets persisted", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })

        const [{ mutations }] = adapter.duplicateIntoTag({
            sourceRef: draftRef,
            targetRef: target.ref,
        })
        const para = mutations.find(
            (m: any) => m.operation.name === "createBlockParagraph",
        )
        expect(para.payload.content).toBe("Hello!")
    })

    test("accepts a transformPayload output the schema normalizes via defaults", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P", tags: ["x"] })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        adapter
            .changeSet(draft.ref)
            .tagPostDefault({ ref: post.ref, tags: ["a", "b"] })
        const [target] = adapter.createDraft({ postRef: post.ref })

        // transformPayload drops `tags`; `.default([])` restores it, so the
        // parsed payload legally differs from the transform output. This must be
        // accepted (and the parsed payload persisted), not rejected.
        const [{ mutations }] = adapter.dupStripTags({
            sourceRef: draft.ref,
            targetRef: target.ref,
        })
        const m = mutations.find(
            (x: any) => x.operation.name === "tagPostDefault",
        )
        expect(m.payload.tags).toEqual([])
    })

    test("returned mutations are the persisted records on the target", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef } = seedSource(adapter, post)

        const [{ draftRef: newDraftRef, mutations, refMap }] =
            adapter.duplicateDraft({ sourceRef: draftRef, postRef: post.ref })

        const persisted = changeSetMutations(adapter, newDraftRef)
        expect(mutations.map((m: any) => m.ref)).toEqual(
            persisted.map((m: any) => m.ref),
        )
        // Logs reference the NEW refs, not the source ones.
        const rowCopy = mutations.find(
            (m: any) => m.operation.name === "createBlockRow",
        )
        const created = rowCopy.log.find((e: any[]) => e[1] === "create")
        expect(created[0]).toBe(refMap.get(rowRef))
        expect(JSON.stringify(rowCopy.log)).not.toContain(rowRef)
    })

    test("copies reset debounceCount, carry the duplicating actor, and are unapplied", () => {
        const engine = makeEngine()
        const snowflake = new Snowflake(10, 10)
        const author = makeAdapter({
            engine,
            snowflake,
            session: { identityRef: "User/author" },
        })
        const [post] = author.createPost({ title: "P" })
        const { draftRef } = seedSource(author, post)

        const duplicator = makeAdapter({
            engine,
            snowflake,
            session: { identityRef: "User/duplicator" },
        })
        const [{ mutations }] = duplicator.duplicateDraft({
            sourceRef: draftRef,
            postRef: post.ref,
        })

        expect(mutations.length).toBeGreaterThan(0)
        for (const m of mutations) {
            expect(m.debounceCount).toBe(0)
            expect(m.identityRef).toBe("User/duplicator")
            expect(m.appliedAt ?? null).toBeNull()
        }
    })

    test("does not mutate the source changeSet", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef } = seedSource(adapter, post)

        const before = JSON.stringify(changeSetMutations(adapter, draftRef))
        adapter.duplicateDraft({ sourceRef: draftRef, postRef: post.ref })
        const after = JSON.stringify(changeSetMutations(adapter, draftRef))
        expect(after).toBe(before)
    })

    test("undo of a copied mutation reverses against the new refs", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef } = seedSource(adapter, post)

        const [{ draftRef: newDraftRef, mutations, refMap }] =
            adapter.duplicateDraft({ sourceRef: draftRef, postRef: post.ref })
        const rowCopy = mutations.find(
            (m: any) => m.operation.name === "createBlockRow",
        )

        const cs = adapter.changeSet(newDraftRef)
        const [, undoMutation] = cs.undo(rowCopy.ref)
        const deleteEntry = undoMutation.log.find(
            (e: any[]) => e[1] === "delete",
        )
        expect(deleteEntry[0]).toBe(refMap.get(rowRef))
        expect(JSON.stringify(undoMutation.log)).not.toContain(rowRef)
    })

    test("each copy's mutation ref and the entity refs it creates share its timestamp", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef } = seedSource(adapter, post)

        const [{ mutations, refMap }] = adapter.duplicateDraft({
            sourceRef: draftRef,
            postRef: post.ref,
        })
        const sf = new Snowflake(10, 10)
        const tsOf = (ref: string) => sf.parse(ref.split("/")[1])[0]
        const rowCopy = mutations.find(
            (m: any) => m.operation.name === "createBlockRow",
        )
        expect(tsOf(rowCopy.ref)).toBe(tsOf(refMap.get(rowRef)))
        expect(new Date(rowCopy.timestamp).getTime()).toBe(tsOf(rowCopy.ref))
    })

    test("throws SingletonDuplicationError when the changeSet creates a singleton", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        adapter.changeSet(draft.ref).createOrgSettings({ name: "Acme" })

        let err: any
        try {
            adapter.duplicateDraft({ sourceRef: draft.ref, postRef: post.ref })
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(SingletonDuplicationError)
        expect(err.entityKind).toBe("OrgSettings")
    })

    test("throws ChangeSetNotEmptyError when the target already has pending mutations", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })
        adapter.changeSet(target.ref).createBlockRow({ parentRef: post.ref })

        let err: any
        try {
            adapter.duplicateInto({
                sourceRef: draftRef,
                targetRef: target.ref,
            })
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(ChangeSetNotEmptyError)
        expect(err.targetChangeSetRef).toBe(target.ref)
        expect(err.existingCount).toBeGreaterThan(0)
    })

    test("throws NotFoundError when the source changeSet does not exist", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const [target] = adapter.createDraft({ postRef: post.ref })

        let err: any
        try {
            adapter.duplicateInto({
                sourceRef: "Draft/999999999",
                targetRef: target.ref,
            })
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(NotFoundError)
    })

    test("validates the transformPayload output against the operation schema", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })

        let err: any
        try {
            adapter.duplicateIntoBadTransform({
                sourceRef: draftRef,
                targetRef: target.ref,
            })
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(BadRequestError)
        // Nothing was persisted into the target.
        expect(changeSetMutations(adapter, target.ref)).toHaveLength(0)
    })

    test("deep-remaps refs inside log reverse/delete blobs, not just the leading ref", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const [source] = adapter.createDraft({ postRef: post.ref })
        const cs = adapter.changeSet(source.ref)
        const [{ block: a }] = cs.createBlockRow({ parentRef: post.ref })
        const [{ block: b }] = cs.createBlockParagraph({ parentRef: a.ref })
        // deleteBlocks patches a's children (update reverse holds [b]) and
        // deletes b (delete document holds b, whose parents.parent is a).
        cs.deleteBlocks([b.ref])

        const [{ mutations, refMap }] = adapter.duplicateDraft({
            sourceRef: source.ref,
            postRef: post.ref,
        })

        const delCopy = mutations.find(
            (m: any) => m.operation.name === "deleteBlocks",
        )
        const deleteEntry = delCopy.log.find((e: any[]) => e[1] === "delete")
        expect(deleteEntry[0]).toBe(refMap.get(b.ref))
        // The deleted document's relation points at the NEW parent, not source.
        expect(deleteEntry[2].parents.parent).toBe(refMap.get(a.ref))
        // No source ref survives anywhere in the copied log (incl. the update
        // reverse blob) — undo/redo in the copy operates only on new refs.
        expect(JSON.stringify(delCopy.log)).not.toContain(a.ref)
        expect(JSON.stringify(delCopy.log)).not.toContain(b.ref)
    })

    // #3: every copy + its entity refs are minted under the single
    // txn.timestamp. The snowflake caps at 4096 ids per millisecond (12-bit
    // sequence), so a duplicate needing >4096 fresh refs used to overflow; it
    // now rolls the logical timestamp into later milliseconds. The source is
    // injected directly (so creation itself never hits the cap); only the
    // duplicate (one txn.timestamp) crosses 4096.
    test("large duplicates roll into later milliseconds instead of overflowing", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const [source] = adapter.createDraft({ postRef: post.ref })
        const [target] = adapter.createDraft({ postRef: post.ref })

        // 2100 mutations, each creating one User ⇒ ~4200 fresh refs on
        // duplicate (one mutation ref + one entity ref each) > 4096. Using
        // independent creates (no shared parent to patch) keeps replay O(n).
        const N = 2100
        for (let i = 0; i < N; i++) {
            const ref = `Mutation/${1_000_000_000_000 + i}`
            adapter._engineOpts.mutations.set(ref, {
                ref,
                timestamp: `2020-01-01T00:00:00.000Z`,
                operation: { name: "createUser", version: 1 },
                payload: { email: `user${i}@example.com` },
                log: [[`User/${2_000_000_000_000 + i}`, "create"]],
                changeSetRef: source.ref,
                debounceCount: 0,
                identityRef: "User/42",
            })
        }

        let result: any
        expect(() => {
            ;[result] = adapter.duplicateInto({
                sourceRef: source.ref,
                targetRef: target.ref,
            })
        }).not.toThrow()
        // All N mutations were copied, with distinct (monotonic) refs.
        expect(result.mutations).toHaveLength(N)
        expect(changeSetMutations(adapter, target.ref)).toHaveLength(N)
        const refs = result.mutations.map((m: any) => m.ref)
        expect(new Set(refs).size).toBe(N)
    })

    test("transformPayload rewriting embedded refs is reflected in log blobs", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const [source] = adapter.createDraft({ postRef: post.ref })
        const cs = adapter.changeSet(source.ref)
        const [{ block: a }] = cs.createBlockRow({ parentRef: post.ref })
        // B's content embeds A's ref as a substring (not a standalone value),
        // so only transformPayload can rewrite it.
        const [{ block: b }] = cs.createBlockParagraph({
            parentRef: post.ref,
            content: "link:" + a.ref,
        })
        // Deleting B puts B's document (content "link:<A>") into a delete blob.
        cs.deleteBlocks([b.ref])
        const [target] = adapter.createDraft({ postRef: post.ref })

        const [{ mutations, refMap }] = adapter.duplicateIntoRewriteEmbedded({
            sourceRef: source.ref,
            targetRef: target.ref,
        })

        // The transform rewrote the embedded ref in the create payload...
        const paraCopy = mutations.find(
            (m: any) => m.operation.name === "createBlockParagraph",
        )
        expect(paraCopy.payload.content).toBe("link:" + refMap.get(a.ref))
        // ...so it must also be reflected in the delete blob — otherwise undo
        // restores B with a source ref. No source ref may survive anywhere.
        expect(JSON.stringify(mutations)).not.toContain(a.ref)
    })

    test("resolves base entities from the source's version snapshot (seeding)", () => {
        const adapter = makeAdapter()
        // basePost lives ONLY in the version snapshot, never in the live store —
        // so the duplicate can only resolve it if loadChangeSetBase seeds it.
        const basePost = makeDoc("Post/900000000000", "Post", {
            data: { title: "Base", tags: [] },
            children: { blocks: [] },
        })
        const versionRef = "PostVersion/900000000001"
        adapter._engineOpts.entities.set(
            versionRef,
            makeDoc(versionRef, "PostVersion", {
                data: { version: 1, snapshot: [basePost] },
                parents: { post: basePost.ref },
            }),
        )
        const sourceRef = "Draft/900000000002"
        adapter._engineOpts.entities.set(
            sourceRef,
            makeDoc(sourceRef, "Draft", {
                parents: { post: basePost.ref, version: versionRef },
            }),
        )
        // A changeSet mutation that reads + patches the snapshot-only base.
        adapter._engineOpts.mutations.set("Mutation/900000000003", {
            ref: "Mutation/900000000003",
            timestamp: TS,
            operation: { name: "createBlockRow", version: 1 },
            payload: { parentRef: basePost.ref },
            log: [["BlockRow/900000000004", "create"]],
            changeSetRef: sourceRef,
            debounceCount: 0,
            identityRef: "User/42",
        })

        const [livePost] = adapter.createPost({ title: "P" })
        const [target] = adapter.createDraft({ postRef: livePost.ref })

        // Succeeds only because basePost was seeded from the snapshot; otherwise
        // the replayed createBlockRow's readEntity(basePost) would throw.
        const [{ mutations, refMap }] = adapter.duplicateInto({
            sourceRef,
            targetRef: target.ref,
        })
        expect(mutations).toHaveLength(1)
        const newRow = refMap.get("BlockRow/900000000004")
        expect(newRow).toBeDefined()
        expect(newRow).not.toBe("BlockRow/900000000004")
        // The base was never materialized into the live store.
        expect(adapter._engineOpts.entities.has(basePost.ref)).toBe(false)
    })
})
