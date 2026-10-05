import {
    entities,
    operations,
    testAdapterImplementation,
} from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import {
    ConflictError,
    NotFoundError,
    Query,
    QueryChain,
    Snowflake,
    writeOperation,
} from "roc-db"
import { z } from "zod"
import { selector, store } from "valdres"
import { createValdresAdapter } from "./createValdresAdapter"
import { cacheTokenAtom, peekScopeState } from "./lib/scopeState"
import { ChangeSetScopeNotOpenError } from "./lib/scopeTransaction"
import type { ValdresEngine } from "./types/ValdresEngine"
import { createAtoms } from "../test/createAtoms"
import { freezingStore } from "../test/freezingStore"

// Regressions for the move to the valdres 1.0 betas (1.0.0-beta.24+), which
// replaced atomFamily with collection()/family() and dropped hasScope,
// onDispose, unsetAll and in-transaction scope creation.

// A changeSet edit that fails after patching its parent, so roc-db's changeSet
// cache already holds the patch when the transaction rolls back.
const failAfterPatch = writeOperation(
    "failAfterPatch",
    z.object({ ref: z.string() }).strict(),
    txn =>
        QueryChain(
            Query(() => txn.readEntity(txn.payload.ref, true)),
            Query((post: any) =>
                txn.patchEntity(txn.payload.ref, {
                    children: {
                        blocks: [...post.children.blocks, "BlockParagraph/1"],
                    },
                }),
            ),
            Query(() => {
                throw new Error("failAfterPatch")
            }),
        ),
    { changeSetOnly: true },
)

// Each adapter gets its own id generator, so refs from a source adapter loaded
// into a target never collide with refs the target generates itself.
let serverId = 0
const setup = ({ optimistic }: { optimistic?: boolean } = {}) => {
    const rootStore = store()
    const atoms = createAtoms()
    const adapter = createValdresAdapter({
        store: rootStore,
        ...atoms,
        snowflake: new Snowflake(2, ++serverId),
        operations: [...operations, failAfterPatch],
        entities,
        session: { identityRef: "User/42" },
        ...(optimistic === undefined ? {} : { optimistic }),
    })
    return { rootStore, ...atoms, adapter }
}

const setupDraft = () => {
    const ctx = setup()
    const [post] = ctx.adapter.createPost({ title: "Host", tags: [] })
    const [draft] = ctx.adapter.createDraft({ postRef: post.ref })
    const cs = ctx.adapter.changeSet(draft.ref)
    return { ...ctx, post, draft, cs, scope: cs._engineOpts.scopedStore }
}

// The shared conformance suite again, with every stored value deep-frozen, so
// code that mutates a value valdres holds by reference fails here.
describe("createValdresAdapter with frozen values", () => {
    testAdapterImplementation<ValdresEngine>(createValdresAdapter, () => ({
        store: freezingStore(store()),
        ...createAtoms(),
    }))
})

describe("valdres 1.0 compatibility", () => {
    test("index lookups hold ref arrays", () => {
        // valdres `set` stores a function value as-is; only `update` calls it.
        const { rootStore, entityIndexAtom, adapter } = setup()
        const [a] = adapter.createPost({ title: "A", tags: ["x"] })
        const [b] = adapter.createPost({ title: "B", tags: ["x"] })
        expect(rootStore.get(entityIndexAtom("Post", "tags", "x"))).toEqual([
            a.ref,
            b.ref,
        ])
        adapter.updatePostTags({ ref: a.ref, tags: ["y"] })
        expect(rootStore.get(entityIndexAtom("Post", "tags", "x"))).toEqual([
            b.ref,
        ])
        adapter.deletePost(b.ref)
        expect(rootStore.get(entityIndexAtom("Post", "tags", "x"))).toEqual([])
    })

    test("unique lookups are released on change and delete", () => {
        const { rootStore, entityUniqueAtom, adapter } = setup()
        const [post] = adapter.createPost({ title: "A", tags: [], slug: "a" })
        expect(rootStore.get(entityUniqueAtom("Post", "slug", "a"))).toBe(
            post.ref,
        )
        adapter.updatePostSlug({ ref: post.ref, slug: "b" })
        expect(rootStore.get(entityUniqueAtom("Post", "slug", "a"))).toBeNull()
        adapter.deletePost(post.ref)
        expect(rootStore.get(entityUniqueAtom("Post", "slug", "b"))).toBeNull()
        // Both slugs are free again.
        adapter.createPost({ title: "B", tags: [], slug: "a" })
        adapter.createPost({ title: "C", tags: [], slug: "b" })
    })

    test("deleting in a changeSet hides the entity in the scope only", () => {
        const { rootStore, entityAtom, adapter, draft } = setupDraft()
        adapter.createOrgSettings({ name: "Acme" })
        const cs = adapter.changeSet(draft.ref)
        const scope = cs._engineOpts.scopedStore
        const settings = entityAtom("OrgSettings")

        cs.deleteOrgSettings({})
        expect(scope.get(settings)).toBeUndefined()
        expect(scope.get(entityAtom)).not.toContain(settings)
        expect(rootStore.get(settings)?.data.name).toBe("Acme")
        expect(rootStore.get(entityAtom)).toContain(settings)
    })

    test("a failed write rolls back root and scope and notifies nobody", () => {
        const {
            rootStore,
            entityAtom,
            mutationAtom,
            adapter,
            post,
            cs,
            scope,
        } = setupDraft()
        adapter.createPost({ title: "Taken", tags: [], slug: "taken" })
        const rootEntities = rootStore.get(entityAtom)
        const rootMutations = rootStore.get(mutationAtom)
        const scopeEntities = scope.get(entityAtom)
        let notified = 0
        const subs = [
            rootStore.sub(entityAtom, () => notified++),
            rootStore.sub(mutationAtom, () => notified++),
            scope.sub(entityAtom, () => notified++),
            scope.sub(entityAtom(post.ref), () => notified++),
        ]

        expect(() =>
            adapter.createPost({ title: "Again", tags: [], slug: "taken" }),
        ).toThrow(ConflictError)
        expect(() =>
            cs.createBlockParagraph({ parentRef: "Post/404" }),
        ).toThrow()

        expect(notified).toBe(0)
        expect(rootStore.get(entityAtom)).toBe(rootEntities)
        expect(rootStore.get(mutationAtom)).toBe(rootMutations)
        expect(scope.get(entityAtom)).toBe(scopeEntities)

        // The adapter keeps working after the failures.
        const [{ block }] = cs.createBlockParagraph({ parentRef: post.ref })
        expect(scope.get(entityAtom(block.ref))).toBeDefined()
        subs.forEach(unsubscribe => unsubscribe())
    })

    test("a failed changeSet write does not leave its patch in the cache", () => {
        const { rootStore, post, cs } = setupDraft()
        cs.createBlockParagraph({ parentRef: post.ref })
        expect(() => cs.failAfterPatch({ ref: post.ref })).toThrow(
            "failAfterPatch",
        )
        expect(cs.readEntity(post.ref).children.blocks).toHaveLength(1)
        // Also when the caller's transaction is the one that rolls back.
        expect(() =>
            rootStore.txn(txn => {
                cs.clone({ txn }).createBlockParagraph({ parentRef: post.ref })
                throw new Error("rollback")
            }),
        ).toThrow("rollback")
        expect(cs.readEntity(post.ref).children.blocks).toHaveLength(1)
    })

    test("a changeSet write notifies root and scope subscribers once", () => {
        const { rootStore, entityAtom, mutationAtom, post, cs, scope } =
            setupDraft()
        const counts = { rootMutations: 0, rootPost: 0, scope: 0, scopePost: 0 }
        rootStore.sub(mutationAtom, () => counts.rootMutations++)
        rootStore.sub(entityAtom(post.ref), () => counts.rootPost++)
        scope.sub(entityAtom, () => counts.scope++)
        scope.sub(entityAtom(post.ref), () => counts.scopePost++)

        const [{ block }] = cs.createBlockParagraph({ parentRef: post.ref })

        // One commit covers the root mutation and the scope's entities; the
        // root post itself is untouched by a draft.
        expect(counts).toEqual({
            rootMutations: 1,
            rootPost: 0,
            scope: 1,
            scopePost: 1,
        })
        expect(rootStore.get(entityAtom(block.ref))).toBeUndefined()
        expect(scope.get(entityAtom(block.ref))?.ref).toBe(block.ref)
    })

    test("derived selectors follow changeSet writes and the apply in the root", () => {
        const { rootStore, entityAtom, adapter, post, draft, cs, scope } =
            setupDraft()
        const blockCount = selector(
            get =>
                get(entityAtom).filter(row =>
                    get(row)?.entity.startsWith("Block"),
                ).length,
        )
        const postBlocks = selector(
            get => get(entityAtom(post.ref))?.children.blocks.length,
        )
        expect([rootStore.get(blockCount), scope.get(blockCount)]).toEqual([
            0, 0,
        ])

        cs.createBlockParagraph({ parentRef: post.ref })
        cs.createBlockParagraph({ parentRef: post.ref })
        expect([rootStore.get(blockCount), scope.get(blockCount)]).toEqual([
            0, 2,
        ])
        expect([rootStore.get(postBlocks), scope.get(postBlocks)]).toEqual([
            0, 2,
        ])

        adapter.applyDraft(draft.ref)
        expect([rootStore.get(blockCount), scope.get(blockCount)]).toEqual([
            2, 2,
        ])
        expect([rootStore.get(postBlocks), scope.get(postBlocks)]).toEqual([
            2, 2,
        ])
    })

    test("loads changeSet mutations into a scope that was never opened", () => {
        const source = setupDraft()
        const [{ block }] = source.cs.createBlockParagraph({
            parentRef: source.post.ref,
        })
        const mutations = source.adapter.pageMutations({})

        const target = setup()
        let commits = 0
        target.rootStore.sub(target.mutationAtom, () => commits++)
        target.adapter.loadMutations(mutations)

        // prepareChangeSets opened the scope before the batch's transaction,
        // so all mutations land in one commit.
        expect(commits).toBe(1)
        expect(target.rootStore.get(target.mutationAtom)).toHaveLength(
            mutations.length,
        )
        const scope = target.rootStore.scope(source.draft.ref)
        expect(scope.get(target.entityAtom(block.ref))?.ref).toBe(block.ref)
        expect(
            target.rootStore.get(target.entityAtom(block.ref)),
        ).toBeUndefined()

        // Opening the changeSet later reuses what was loaded.
        const cs = target.adapter.changeSet(source.draft.ref)
        expect(cs.readEntity(block.ref).ref).toBe(block.ref)
    })

    test("loads a batch spanning an open and an unopened changeSet", () => {
        // The batch's scopes are opened before its transaction starts, so it
        // runs once: nothing in the open changeSet's cache is applied twice.
        const source = setupDraft()
        const [draft2] = source.adapter.createDraft({
            postRef: source.post.ref,
        })
        const cs2 = source.adapter.changeSet(draft2.ref)
        source.cs.createBlockParagraph({ parentRef: source.post.ref })
        const known = source.adapter.pageMutations({})
        const [{ block: b1 }] = source.cs.createBlockParagraph({
            parentRef: source.post.ref,
        })
        cs2.createBlockParagraph({ parentRef: source.post.ref })
        const fresh = source.adapter
            .pageMutations({})
            .filter((m: any) => !known.some((k: any) => k.ref === m.ref))

        const target = setup()
        target.adapter.loadMutations(known)
        const cs = target.adapter.changeSet(source.draft.ref)
        expect(cs.readEntity(source.post.ref).children.blocks).toHaveLength(1)
        target.adapter.loadMutations(fresh)

        const blocks = cs.readEntity(source.post.ref).children.blocks
        expect(blocks).toHaveLength(2)
        expect(blocks).toContain(b1.ref)
        expect(
            target.rootStore
                .scope(draft2.ref)
                .get(target.entityAtom(source.post.ref))?.children.blocks,
        ).toHaveLength(1)
    })

    test("a rolled-back apply leaves the changeSet usable", () => {
        const { rootStore, adapter, post, draft, cs } = setupDraft()
        cs.createBlockParagraph({ parentRef: post.ref })
        expect(() =>
            rootStore.txn(txn => {
                adapter.clone({ txn }).applyDraft(draft.ref)
                throw new Error("rollback")
            }),
        ).toThrow("rollback")
        cs.createBlockParagraph({ parentRef: post.ref })
        expect(cs.readEntity(post.ref).children.blocks).toHaveLength(2)
    })

    test("rebuilds a scope re-created outside the adapter", () => {
        const source = setupDraft()
        const [{ block: b1 }] = source.cs.createBlockParagraph({
            parentRef: source.post.ref,
        })
        const known = source.adapter.pageMutations({})
        source.cs.createBlockParagraph({ parentRef: source.post.ref })
        const fresh = source.adapter
            .pageMutations({})
            .filter((m: any) => !known.some((k: any) => k.ref === m.ref))

        const target = setup()
        target.adapter.loadMutations(known)
        const cs = target.adapter.changeSet(source.draft.ref)
        cs.readEntity(source.post.ref)
        const cache = peekScopeState(
            target.rootStore,
            source.draft.ref,
        )?.txnCache
        expect(cache).toBeDefined()

        // Something other than the adapter (a UI, say) re-creates the scope.
        cs._engineOpts.scopedStore.dispose()
        const recreated = target.rootStore.scope(source.draft.ref)
        target.adapter.loadMutations(fresh)

        const state = peekScopeState(target.rootStore, source.draft.ref)
        expect(state?.txnCache).not.toBe(cache)
        expect(recreated.get(cacheTokenAtom)).toBe(state?.cacheToken)
        expect(
            recreated.get(target.entityAtom(source.post.ref))?.children.blocks,
        ).toHaveLength(2)
        // Only the new mutation's rows reached the re-created scope. Opening
        // the changeSet rebuilds it from the whole history, without rolling
        // the newer rows back.
        expect(recreated.get(target.entityAtom(b1.ref))).toBeUndefined()
        target.adapter.changeSet(source.draft.ref)
        expect(recreated.get(target.entityAtom(b1.ref))?.ref).toBe(b1.ref)
        expect(
            recreated.get(target.entityAtom(source.post.ref))?.children.blocks,
        ).toHaveLength(2)
    })

    test("opening a loaded versioned draft keeps its loaded edits", () => {
        const source = setupDraft()
        const rootMutations = source.adapter.pageMutations({})
        source.cs.updatePostTitle({ ref: source.post.ref, title: "Draft" })
        const draftMutations = source.adapter
            .pageMutations({})
            .filter(
                (m: any) => !rootMutations.some((k: any) => k.ref === m.ref),
            )

        const target = setup()
        target.adapter.loadMutations(rootMutations)
        // Give the draft a base snapshot.
        const { rootStore, entityAtom } = target
        const meta = { mutationRef: "Mutation/1", timestamp: "2020-01-01" }
        const versionRef = "PostVersion/920000000001"
        rootStore.set(entityAtom(versionRef), {
            ref: versionRef,
            entity: "PostVersion",
            created: meta,
            updated: meta,
            data: {
                version: 1,
                snapshot: [rootStore.get(entityAtom(source.post.ref))],
            },
            children: {},
            parents: { post: source.post.ref },
            ancestors: {},
        } as any)
        const draftDoc: any = rootStore.get(entityAtom(source.draft.ref))
        rootStore.set(entityAtom(source.draft.ref), {
            ...draftDoc,
            parents: { ...draftDoc.parents, version: versionRef },
        })

        target.adapter.loadMutations(draftMutations)
        const scope = rootStore.scope(source.draft.ref)
        expect(scope.get(entityAtom(source.post.ref))?.data.title).toBe("Draft")
        const cs = target.adapter.changeSet(source.draft.ref)
        expect(scope.get(entityAtom(source.post.ref))?.data.title).toBe("Draft")
        expect(cs.readEntity(source.post.ref).data.title).toBe("Draft")
    })

    test("composes changeSet work with the caller's transaction", () => {
        const { rootStore, entityAtom, mutationAtom, adapter, post, draft } =
            setupDraft()
        const mutationCount = rootStore.get(mutationAtom).length

        let blockRef: string | undefined
        expect(() =>
            rootStore.txn(txn => {
                const cs = adapter.clone({ txn }).changeSet(draft.ref)
                const [{ block }] = cs.createBlockParagraph({
                    parentRef: post.ref,
                })
                blockRef = block.ref
                throw new Error("rollback")
            }),
        ).toThrow("rollback")
        expect(blockRef).toBeDefined()
        expect(rootStore.get(mutationAtom)).toHaveLength(mutationCount)
        expect(
            rootStore.scope(draft.ref).get(entityAtom(blockRef!)),
        ).toBeUndefined()

        rootStore.txn(txn => {
            const cs = adapter.clone({ txn }).changeSet(draft.ref)
            const [{ block }] = cs.createBlockParagraph({
                parentRef: post.ref,
            })
            blockRef = block.ref
        })
        expect(rootStore.get(mutationAtom)).toHaveLength(mutationCount + 1)
        expect(rootStore.scope(draft.ref).get(entityAtom(blockRef!))?.ref).toBe(
            blockRef,
        )
    })

    test("a caught failure inside the caller's transaction does not poison the cache", () => {
        const { rootStore, post, cs, scope, entityAtom } = setupDraft()
        cs.readEntity(post.ref)
        rootStore.txn(txn => {
            try {
                cs.clone({ txn }).failAfterPatch({ ref: post.ref })
            } catch {}
        })
        expect(cs.readEntity(post.ref).children.blocks).toHaveLength(0)
        cs.updatePostDescription({ ref: post.ref, description: "d" })
        expect(scope.get(entityAtom(post.ref))?.children.blocks).toHaveLength(0)
    })

    test("a slug changed in a changeSet is free in that changeSet", () => {
        const { adapter, cs } = setupDraft()
        const [post] = adapter.createPost({ title: "A", tags: [], slug: "a" })
        cs.updatePostSlug({ ref: post.ref, slug: "b" })
        expect(() => cs.readPostBySlug("a")).toThrow(NotFoundError)
        expect(cs.readPostBySlug("b").ref).toBe(post.ref)
        cs.createPost({ title: "B", tags: [], slug: "a" })
    })

    test("a slug freed in a changeSet and reclaimed in the root is taken", () => {
        const { adapter, cs } = setupDraft()
        const [a] = adapter.createPost({ title: "A", tags: [], slug: "a" })
        cs.updatePostSlug({ ref: a.ref, slug: "b" })
        adapter.updatePostSlug({ ref: a.ref, slug: "z" })
        const [c] = adapter.createPost({ title: "C", tags: [], slug: "a" })
        expect(cs.readPostBySlug("a").ref).toBe(c.ref)
        expect(() =>
            cs.createPost({ title: "D", tags: [], slug: "a" }),
        ).toThrow(ConflictError)
    })

    test("a cache created inside a rolled-back transaction is not reused", () => {
        const source = setupDraft()
        source.cs.createBlockParagraph({ parentRef: source.post.ref })
        const mutations = source.adapter.pageMutations({})

        // Root-adapter writes leave the scope with a token but no cache.
        const target = setup()
        target.adapter.loadMutations(mutations)
        const cs = target.adapter.changeSet(source.draft.ref)
        expect(() =>
            target.rootStore.txn(txn => {
                target.adapter.clone({ txn }).updatePostTitle({
                    ref: source.post.ref,
                    title: "Rolled back",
                })
                cs.clone({ txn }).readEntity(source.post.ref)
                throw new Error("rollback")
            }),
        ).toThrow("rollback")
        expect(cs.readEntity(source.post.ref).data.title).toBe("Host")
    })

    test("reads on a changeSet do not commit", () => {
        const { post, cs, scope } = setupDraft()
        cs.readEntity(post.ref)
        let commits = 0
        scope.sub(cacheTokenAtom, () => commits++)
        cs.readEntity(post.ref)
        cs.readEntity(post.ref)
        expect(commits).toBe(0)
    })

    test("applying releases the changeSet's cache", () => {
        const { rootStore, adapter, post, draft, cs } = setupDraft()
        cs.createBlockParagraph({ parentRef: post.ref })
        expect(peekScopeState(rootStore, draft.ref)?.txnCache).toBeDefined()
        adapter.applyDraft(draft.ref)
        expect(peekScopeState(rootStore, draft.ref)?.txnCache).toBeUndefined()
    })

    test("applies a draft whose scope was disposed", () => {
        const { rootStore, entityAtom, adapter, post, draft, cs, scope } =
            setupDraft()
        const [{ block }] = cs.createBlockParagraph({ parentRef: post.ref })
        scope.dispose()
        adapter.applyDraft(draft.ref)
        expect(rootStore.get(entityAtom(block.ref))?.ref).toBe(block.ref)
    })

    test("persists changeSet mutations into the changeSet's scope", () => {
        const source = setupDraft()
        const [{ block }] = source.cs.createBlockParagraph({
            parentRef: source.post.ref,
        })
        const target = setup({ optimistic: false })
        target.adapter.persistOptimisticMutations(
            source.adapter.pageMutations({}),
        )
        const scope = target.rootStore.scope(source.draft.ref)
        expect(scope.get(target.entityAtom(block.ref))?.ref).toBe(block.ref)
        expect(
            target.rootStore.get(target.entityAtom(block.ref)),
        ).toBeUndefined()
    })

    test("loads into an open scope inside the caller's transaction", () => {
        const source = setupDraft()
        const [{ block }] = source.cs.createBlockParagraph({
            parentRef: source.post.ref,
        })
        // valdres allows no other store work while a transaction is open, so
        // read the source first.
        const mutations = source.adapter.pageMutations({})
        const target = setup()
        const scope = target.rootStore.scope(source.draft.ref)
        target.rootStore.txn(txn =>
            target.adapter.clone({ txn }).loadMutations(mutations),
        )
        expect(scope.get(target.entityAtom(block.ref))?.ref).toBe(block.ref)
    })

    test("a store-less adapter keeps draft writes out of the root", () => {
        const source = setupDraft()
        const rootMutations = source.adapter.pageMutations({})
        source.cs.updatePostTitle({ ref: source.post.ref, title: "Draft" })
        const draftMutations = source.adapter
            .pageMutations({})
            .filter(
                (m: any) => !rootMutations.some((k: any) => k.ref === m.ref),
            )

        const target = setup()
        target.adapter.loadMutations(rootMutations)
        expect(() =>
            target.rootStore.txn(txn =>
                target.adapter
                    .clone({ store: undefined, txn })
                    .loadMutations(draftMutations),
            ),
        ).toThrow(ChangeSetScopeNotOpenError)

        const scope = target.rootStore.scope(source.draft.ref)
        target.rootStore.txn(txn =>
            target.adapter
                .clone({ store: undefined, txn })
                .loadMutations(draftMutations),
        )
        expect(
            target.rootStore.get(target.entityAtom(source.post.ref))?.data
                .title,
        ).toBe("Host")
        expect(scope.get(target.entityAtom(source.post.ref))?.data.title).toBe(
            "Draft",
        )
    })

    test("a store-less adapter opens a changeSet inside the caller's transaction", () => {
        const { rootStore, entityAtom, adapter } = setup()
        const [post] = adapter.createPost({ title: "Host", tags: [] })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        const scope = rootStore.scope(draft.ref)
        rootStore.txn(txn =>
            adapter
                .clone({ store: undefined, txn })
                .changeSet(draft.ref)
                .createBlockParagraph({ parentRef: post.ref }),
        )
        expect(scope.get(entityAtom(post.ref))?.children.blocks).toHaveLength(1)
        expect(
            rootStore.get(entityAtom(post.ref))?.children.blocks,
        ).toHaveLength(0)
    })

    test("a settle handler writes through its transaction", () => {
        const { rootStore, entityAtom, adapter } = setup()
        const [post] = adapter.createPost({ title: "Host", tags: [] })
        let created: any
        const stop = rootStore.sub(entityAtom(post.ref), {
            settle: tx => {
                if (created) return
                ;[created] = adapter
                    .clone({ txn: tx })
                    .createPost({ title: "From settle", tags: [] })
            },
        })
        adapter.updatePostTitle({ ref: post.ref, title: "Renamed" })
        stop()
        expect(rootStore.get(entityAtom(created.ref))?.data.title).toBe(
            "From settle",
        )
    })

    test("a UI child of the scope can be disposed without ending the changeSet", () => {
        const { rootStore, entityAtom, post, draft, cs } = setupDraft()
        const view = rootStore.scope(draft.ref).scope()
        const [{ block }] = cs.createBlockParagraph({ parentRef: post.ref })
        expect(view.get(entityAtom(block.ref))?.ref).toBe(block.ref)
        view.dispose()
        cs.createBlockParagraph({ parentRef: post.ref })
        expect(cs.readEntity(post.ref).children.blocks).toHaveLength(2)
    })

    test("rejects async mode", () => {
        expect(() =>
            createValdresAdapter({
                store: store(),
                ...createAtoms(),
                operations,
                entities,
                session: { identityRef: "User/42" },
                async: true,
            } as any),
        ).toThrow("does not support async")
    })

    test("changeSet() inside a caller's transaction needs an open scope", () => {
        const { rootStore, mutationAtom, adapter } = setup()
        const [post] = adapter.createPost({ title: "Host", tags: [] })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        const mutations = rootStore.get(mutationAtom)
        expect(() =>
            rootStore.txn(txn => adapter.clone({ txn }).changeSet(draft.ref)),
        ).toThrow(ChangeSetScopeNotOpenError)
        expect(rootStore.get(mutationAtom)).toBe(mutations)
    })

    test("a caller's transaction cannot open a changeSet scope", () => {
        const source = setupDraft()
        source.cs.createBlockParagraph({ parentRef: source.post.ref })
        const mutations = source.adapter.pageMutations({})

        const target = setup()
        expect(() =>
            target.rootStore.txn(txn =>
                target.adapter.clone({ txn }).loadMutations(mutations),
            ),
        ).toThrow(ChangeSetScopeNotOpenError)
        expect(target.rootStore.get(target.mutationAtom)).toHaveLength(0)
    })
})
