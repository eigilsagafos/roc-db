import { createInMemoryAdapter } from "@roc-db/in-memory"
import { DraftRefSchema, entities, operations } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { ChangeSetIntegrityError } from "../errors/ChangeSetIntegrityError"
import { SingletonDuplicationError } from "../errors/SingletonDuplicationError"
import { entityFromRef } from "../utils/entityFromRef"
import { Query } from "../utils/Query"
import { QueryChain } from "../utils/QueryChain"
import { Snowflake } from "../utils/Snowflake"
import { sortMutations } from "../utils/sortMutations"
import { writeOperation } from "../writeOperation"

// Minimal apply op: apply the changeSet onto its base, then mark the draft applied.
const applyDraftTest = writeOperation("applyDraftTest", DraftRefSchema, txn => {
    const ref = txn.payload
    return QueryChain(
        Query(() => txn.applyChangeSet(ref)),
        Query(() =>
            txn.patchEntity(ref, { data: { appliedAt: txn.timestamp } }),
        ),
    )
})

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
        operations: [...operations, applyDraftTest],
        entities,
        session,
        snowflake,
        engine,
    })

// Build a source changeSet: a Post (base) with a BlockRow created in the
// changeSet and a BlockParagraph child of that row (cross-reference between two
// changeSet-created entities).
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

describe("duplicateChangeSetMutations", () => {
    test("remaps every created ref to a distinct new ref with no overlap", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef, paraRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })

        const { refMap } = adapter.duplicateChangeSetMutations(
            draftRef,
            target.ref,
        )

        // Both changeSet-created entities are remapped.
        expect(refMap.has(rowRef)).toBe(true)
        expect(refMap.has(paraRef)).toBe(true)
        // Base ref (the Post) is NOT remapped.
        expect(refMap.has(post.ref)).toBe(false)
        // New refs are distinct from the source refs and from each other...
        const newRow = refMap.get(rowRef)
        const newPara = refMap.get(paraRef)
        expect(newRow).not.toBe(rowRef)
        expect(newPara).not.toBe(paraRef)
        expect(newRow).not.toBe(newPara)
        // ...and of the same entity kind.
        expect(entityFromRef(newRow)).toBe(entityFromRef(rowRef))
        expect(entityFromRef(newPara)).toBe(entityFromRef(paraRef))
        const sourceRefs = new Set([rowRef, paraRef])
        for (const v of refMap.values()) expect(sourceRefs.has(v)).toBe(false)
    })

    test("orders each mutation after the mutation that creates its referenced ref", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef, paraRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })

        const { mutations, refMap } = adapter.duplicateChangeSetMutations(
            draftRef,
            target.ref,
        )

        // Verify via the SAME sort the load/apply path uses.
        const sorted = sortMutations(mutations)
        const createIndex = (ref: string) =>
            sorted.findIndex((m: any) =>
                m.log.some((e: any[]) => e[1] === "create" && e[0] === ref),
            )
        const rowCreate = createIndex(refMap.get(rowRef))
        const paraCreate = createIndex(refMap.get(paraRef))
        expect(rowCreate).toBeGreaterThanOrEqual(0)
        expect(paraCreate).toBeGreaterThan(rowCreate)
    })

    test("orders correctly across 3 levels of nesting (A <- B <- C)", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        const cs = adapter.changeSet(draft.ref)
        const [{ block: a }] = cs.createBlockRow({ parentRef: post.ref })
        const [{ block: b }] = cs.createBlockRow({ parentRef: a.ref })
        const [{ block: c }] = cs.createBlockRow({ parentRef: b.ref })
        const [target] = adapter.createDraft({ postRef: post.ref })

        const { mutations, refMap } = adapter.duplicateChangeSetMutations(
            draft.ref,
            target.ref,
        )

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

    test("applying both source and target onto the same base succeeds with no collision", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef, paraRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })

        const { refMap } = adapter.duplicateChangeSetMutations(
            draftRef,
            target.ref,
        )

        expect(() => adapter.applyDraftTest(draftRef)).not.toThrow()
        expect(() => adapter.applyDraftTest(target.ref)).not.toThrow()

        // Base post ends up with both rows; every block entity resolves.
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

        // Keep only the BlockRow create (a self-contained mutation).
        const { mutations, refMap } = adapter.duplicateChangeSetMutations(
            draftRef,
            target.ref,
            {
                filter: (m: any) => m.operation.name === "createBlockRow",
            },
        )
        expect(mutations).toHaveLength(1)
        expect(refMap.has(rowRef)).toBe(true)
        expect(refMap.has(paraRef)).toBe(false)
    })

    test("filtering out a depended-on create throws ChangeSetIntegrityError", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })

        // Drop the row create but keep the paragraph that is its child.
        let err: any
        try {
            adapter.duplicateChangeSetMutations(draftRef, target.ref, {
                filter: (m: any) => m.operation.name !== "createBlockRow",
            })
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(ChangeSetIntegrityError)
        expect(err.danglingRef).toBe(rowRef)
    })

    test("transformPayload receives the refMap and its output is persisted", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })

        let seenRefMap: Map<string, string> | undefined
        const { mutations } = adapter.duplicateChangeSetMutations(
            draftRef,
            target.ref,
            {
                transformPayload: (payload: any, refMap) => {
                    seenRefMap = refMap
                    // Tag every BlockParagraph clone's content.
                    if (typeof payload?.content === "string") {
                        return { ...payload, content: payload.content + "!" }
                    }
                    return payload
                },
            },
        )
        expect(seenRefMap).toBeInstanceOf(Map)
        const para = mutations.find(
            (m: any) => m.operation.name === "createBlockParagraph",
        )
        expect(para.payload.content).toBe("Hello!")
    })

    test("returned mutations match the persisted form on the target", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })

        const { mutations, refMap } = adapter.duplicateChangeSetMutations(
            draftRef,
            target.ref,
        )

        // Equal to a fresh read of the target changeSet, in the same order.
        const persisted = sortMutations(
            [...adapter._engineOpts.mutations.values()].filter(
                (m: any) => m.changeSetRef === target.ref,
            ),
        )
        expect(mutations.map((m: any) => m.ref)).toEqual(
            persisted.map((m: any) => m.ref),
        )
        // Logs were recomputed against the NEW refs, not copied from source.
        const rowClone = mutations.find(
            (m: any) => m.operation.name === "createBlockRow",
        )
        const created = rowClone.log.find((e: any[]) => e[1] === "create")
        expect(created[0]).toBe(refMap.get(rowRef))
        expect(JSON.stringify(rowClone.log)).not.toContain(rowRef)
    })

    test("clones reset debounceCount and carry the duplicating actor's identity", () => {
        const engine = makeEngine()
        const snowflake = new Snowflake(10, 10)
        const author = makeAdapter({
            engine,
            snowflake,
            session: { identityRef: "User/author" },
        })
        const [post] = author.createPost({ title: "P" })
        const { draftRef } = seedSource(author, post)
        const [target] = author.createDraft({ postRef: post.ref })

        // A different actor performs the duplication.
        const duplicator = makeAdapter({
            engine,
            snowflake,
            session: { identityRef: "User/duplicator" },
        })
        const { mutations } = duplicator.duplicateChangeSetMutations(
            draftRef,
            target.ref,
        )

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
        const [target] = adapter.createDraft({ postRef: post.ref })

        const before = JSON.stringify(
            sortMutations(
                [...adapter._engineOpts.mutations.values()].filter(
                    (m: any) => m.changeSetRef === draftRef,
                ),
            ),
        )
        adapter.duplicateChangeSetMutations(draftRef, target.ref)
        const after = JSON.stringify(
            sortMutations(
                [...adapter._engineOpts.mutations.values()].filter(
                    (m: any) => m.changeSetRef === draftRef,
                ),
            ),
        )
        expect(after).toBe(before)
    })

    test("undo of a cloned mutation reverses against the new refs", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const { draftRef, rowRef } = seedSource(adapter, post)
        const [target] = adapter.createDraft({ postRef: post.ref })

        const { mutations, refMap } = adapter.duplicateChangeSetMutations(
            draftRef,
            target.ref,
        )
        const rowClone = mutations.find(
            (m: any) => m.operation.name === "createBlockRow",
        )

        const cs = adapter.changeSet(target.ref)
        const [, undoMutation] = cs.undo(rowClone.ref)
        // The reverse deletes the NEW row, never the source row.
        const deleteEntry = undoMutation.log.find(
            (e: any[]) => e[1] === "delete",
        )
        expect(deleteEntry[0]).toBe(refMap.get(rowRef))
        expect(JSON.stringify(undoMutation.log)).not.toContain(rowRef)
    })

    test("throws SingletonDuplicationError when the changeSet creates a singleton", () => {
        const adapter = makeAdapter()
        const [post] = adapter.createPost({ title: "P" })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        const cs = adapter.changeSet(draft.ref)
        cs.createOrgSettings({ name: "Acme" })
        const [target] = adapter.createDraft({ postRef: post.ref })

        let err: any
        try {
            adapter.duplicateChangeSetMutations(draft.ref, target.ref)
        } catch (e) {
            err = e
        }
        expect(err).toBeInstanceOf(SingletonDuplicationError)
        expect(err.entityKind).toBe("OrgSettings")
    })
})
