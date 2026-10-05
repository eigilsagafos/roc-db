import {
    entities,
    operations,
    testAdapterImplementation,
} from "@roc-db/test-utils"
import { describe, expect, spyOn, test } from "bun:test"
import { store, StoreDisposedError } from "valdres"
import { createValdresAdapter } from "./createValdresAdapter"
import type { ValdresEngine } from "./types/ValdresEngine"
import * as initializeChangeSetModule from "../../../roc-db/src/lib/initializeChangeSet"
import * as loadChangeSetBaseModule from "../../../roc-db/src/lib/loadChangeSetBase"
import { peekScopeState, scopeBaseAtom } from "./lib/scopeState"
import { createAtoms } from "../test/createAtoms"

describe("createValdresAdapter", () => {
    testAdapterImplementation<ValdresEngine>(createValdresAdapter, () => {
        return {
            store: store(),
            ...createAtoms(),
        }
    })
})

// Enabled once `end()` stopped calling `rootTxn.commit()`. That force-committed
// the CALLER's transaction, so a caller throwing afterwards could not roll back;
// the writes now stay staged until the caller's own `store.txn` returns.
test("clone with txn", () => {
    const rootStore = store()
    const { entityAtom: entityFamily, ...atoms } = createAtoms()
    const adapter = createValdresAdapter({
        store: rootStore,
        entityAtom: entityFamily,
        ...atoms,
        operations,
        session: { identityRef: "User/42" },
        entities,
    })

    let post2ref: any
    expect(() => {
        rootStore.txn(txn => {
            const clone = adapter.clone({ txn })
            const [post2] = clone.createPost({ title: "Post 2" })
            post2ref = post2.ref
            throw new Error("rollback")
        })
    }).toThrow("rollback")
    // Guard against passing vacuously: the ref must exist for the null read to
    // mean "rolled back" rather than "never created".
    expect(post2ref).toBeDefined()
    const post2read = rootStore.get(entityFamily(post2ref))
    expect(post2read).toBeUndefined()

    let post3ref: any
    rootStore.txn(txn => {
        const clone = adapter.clone({ txn })
        const [post3] = clone.createPost({ title: "Post 3" })
        post3ref = post3.ref
    })

    const post3read = rootStore.get(entityFamily(post3ref))
    expect(post3read.data.title).toBe("Post 3")
})

test("data is stored in the scoped store", () => {
    const rootStore = store()
    const { entityAtom: entityFamily, ...atoms } = createAtoms()
    const adapter = createValdresAdapter({
        operations,
        entities,
        store: rootStore,
        entityAtom: entityFamily,
        ...atoms,
        session: { identityRef: "User/42" },
    })
    const [post] = adapter.createPost({ title: "Foo" })
    const [draft] = adapter.createDraft({
        postRef: post.ref,
    })
    const changeSetAdapter = adapter.changeSet(draft.ref)

    const [{ block, updatedParent }] = changeSetAdapter.createBlockParagraph({
        parentRef: post.ref,
    })
    const readRes = changeSetAdapter.readEntity(post.ref)
    expect(readRes).toStrictEqual(updatedParent)
    // console.log(changeSetAdapter._engineOpts)
    // const postFromStore = changeSetAdapter._engineOpts.store.get(
    //     entityFamily(post.ref),
    // )
    // console.log("readRes", readRes)
    // console.log("postFromStore", postFromStore)
    // expect(readPostDirect).toStrictEqual(updatedParent)
    // console.log(rest)
    // const draftStore = rootStore.scope(draft.ref)

    // const res = draftStore.get(entityFamily(block.ref))
    // expect(res?.ref).toBe(block.ref)
    // const rootStore = store()
    // const entityFamily = atomFamily(null)
    // const adapter = createValdresAdapter({
    //     store: rootStore,
    //     entityAtom: entityFamily,
    //     mutationAtom: atomFamily(null),
    //     operations,
    //     session: { identityRef: "User/42" },
    //     entities,
    // })
    // const [post1] = adapter.createPost({ title: "Foo" })
    // const post1read = rootStore.get(entityFamily(post1.ref))
    // expect(post1read.data.title).toBe("Foo")
})

test("mutation stored in root store", () => {
    const rootStore = store()
    const {
        entityAtom: entityFamily,
        mutationAtom: mutationFamily,
        ...atoms
    } = createAtoms()
    const adapter = createValdresAdapter({
        store: rootStore,
        entityAtom: entityFamily,
        mutationAtom: mutationFamily,
        ...atoms,
        operations,
        session: { identityRef: "User/42" },
        entities,
    })
    expect(rootStore.get(mutationFamily)).toHaveLength(0)
    const [post] = adapter.createPost({ title: "Foo" })
    expect(rootStore.get(mutationFamily)).toHaveLength(1)
    const [draft] = adapter.createDraft({
        postRef: post.ref,
    })
    expect(rootStore.get(mutationFamily)).toHaveLength(2)
    const changeSetAdapter = adapter.changeSet(draft.ref)
    const [{ block }] = changeSetAdapter.createBlockParagraph({
        parentRef: post.ref,
    })
    expect(rootStore.get(mutationFamily)).toHaveLength(3)
})

const prepareChangeSetTest = ({ optimistic }: { optimistic?: boolean } = {}) => {
    const rootStore = store()
    const {
        entityAtom: entityFamily,
        mutationAtom: mutationFamily,
        ...atoms
    } = createAtoms()
    const adapter = createValdresAdapter({
        store: rootStore,
        entityAtom: entityFamily,
        mutationAtom: mutationFamily,
        ...atoms,
        operations,
        session: { identityRef: "User/42" },
        entities,
        ...(optimistic === undefined ? {} : { optimistic }),
    })
    expect(rootStore.get(mutationFamily)).toHaveLength(0)
    const [post] = adapter.createPost({ title: "Foo" })
    expect(rootStore.get(mutationFamily)).toHaveLength(1)
    const [draft] = adapter.createDraft({
        postRef: post.ref,
    })
    const changeSetAdapter = adapter.changeSet(draft.ref)
    return {
        adapter,
        post,
        draft,
        changeSetAdapter,
    }
}

test("duplicateDraft (txn.duplicateChangeSetMutations) clones a changeSet with remapped refs", () => {
    // Duplication is server-authoritative: run it on a non-optimistic adapter
    // (valdres defaults to optimistic: true).
    const { adapter, post, draft, changeSetAdapter } = prepareChangeSetTest({
        optimistic: false,
    })
    const [{ block: row }] = changeSetAdapter.createBlockRow({
        parentRef: post.ref,
    })
    const [{ block: para }] = changeSetAdapter.createBlockParagraph({
        parentRef: row.ref,
        content: "Hello",
    })

    // One transaction: create the new draft + copy the source's mutations.
    const [{ draftRef: newDraftRef, mutations, refMap }] =
        adapter.duplicateDraft({ sourceRef: draft.ref, postRef: post.ref })

    expect(mutations).toHaveLength(2)
    const newRow = refMap.get(row.ref)
    const newPara = refMap.get(para.ref)
    expect(newRow).toBeDefined()
    expect(newPara).toBeDefined()
    expect(newRow).not.toBe(row.ref)
    expect(newPara).not.toBe(para.ref)

    // The copies resolve in the new draft scope, and the cross-reference
    // (paragraph -> its parent row) was remapped to the new row ref.
    const targetCs = adapter.changeSet(newDraftRef)
    expect(targetCs.readEntity(newRow).ref).toBe(newRow)
    expect(targetCs.readEntity(newPara).parents.parent).toBe(newRow)

    // Source changeSet still resolves to its original refs.
    expect(changeSetAdapter.readEntity(para.ref).parents.parent).toBe(row.ref)
})

test("onChangeSetInit seeds the base from the version snapshot", () => {
    const rootStore = store()
    const { entityAtom: entityFamily, ...atoms } = createAtoms()
    const adapter = createValdresAdapter({
        store: rootStore,
        entityAtom: entityFamily,
        ...atoms,
        operations,
        entities,
        session: { identityRef: "User/42" },
    })
    const [post] = adapter.createPost({ title: "Host" })
    const [draft] = adapter.createDraft({ postRef: post.ref })

    // Base entity lives ONLY in the version snapshot, never in the live store.
    const TS = "2020-01-01T00:00:00.000Z"
    const meta = { mutationRef: "Mutation/1", timestamp: TS }
    const basePost = {
        ref: "Post/920000000000",
        entity: "Post",
        created: meta,
        updated: meta,
        data: { title: "Base", tags: [] },
        children: { blocks: [] },
        parents: {},
        ancestors: {},
    }
    const versionRef = "PostVersion/920000000001"
    rootStore.set(entityFamily(versionRef), {
        ref: versionRef,
        entity: "PostVersion",
        created: meta,
        updated: meta,
        data: { version: 1, snapshot: [basePost] },
        children: {},
        parents: { post: basePost.ref },
        ancestors: {},
    })
    // Point the draft's version parent at the snapshot.
    const draftDoc = rootStore.get(entityFamily(draft.ref)) as any
    rootStore.set(entityFamily(draft.ref), {
        ...draftDoc,
        parents: { ...draftDoc.parents, version: versionRef },
    })
    // The base is not in the live root store.
    expect(rootStore.get(entityFamily(basePost.ref))).toBeUndefined()

    // .changeSet() runs onChangeSetInit, which seeds the version snapshot into
    // the scoped store. Read that scoped store directly (not via readEntity,
    // which would re-seed through roc-db's initializeChangeSet) so this isolates
    // onChangeSetInit's seeding specifically.
    const cs = adapter.changeSet(draft.ref)
    const seeded = cs._engineOpts.scopedStore.get(entityFamily(basePost.ref))
    expect(seeded).toBeDefined()
    expect(seeded.ref).toBe(basePost.ref)
    expect(seeded.data.title).toBe("Base")
})

test("initChangeSet not called on operations in changeSet", () => {
    const { changeSetAdapter, post } = prepareChangeSetTest()
    const initializeChangeSetSpy = spyOn(
        initializeChangeSetModule,
        "initializeChangeSet",
    )
    const initializeChangeSetSyncSpy = spyOn(
        initializeChangeSetModule,
        "initializeChangeSetSync",
    )
    expect(initializeChangeSetSpy).toHaveBeenCalledTimes(0)
    expect(initializeChangeSetSyncSpy).toHaveBeenCalledTimes(0)
    changeSetAdapter.createBlockParagraph({
        parentRef: post.ref,
    })
    expect(initializeChangeSetSpy).toHaveBeenCalledTimes(1)
    expect(initializeChangeSetSyncSpy).toHaveBeenCalledTimes(1)
    changeSetAdapter.createBlockParagraph({
        parentRef: post.ref,
    })
    expect(initializeChangeSetSpy).toHaveBeenCalledTimes(2)
    expect(initializeChangeSetSyncSpy).toHaveBeenCalledTimes(1)
    changeSetAdapter.createBlockParagraph({
        parentRef: post.ref,
    })
    expect(initializeChangeSetSpy).toHaveBeenCalledTimes(3)
    expect(initializeChangeSetSyncSpy).toHaveBeenCalledTimes(1)
    changeSetAdapter.createBlockParagraph({
        parentRef: post.ref,
    })
    expect(initializeChangeSetSpy).toHaveBeenCalledTimes(4)
    expect(initializeChangeSetSyncSpy).toHaveBeenCalledTimes(1)
})

// valdres removed the private `store.data` / `txn.data` handles in
// 1.0.0-beta.17. The scope-lifetime state the adapter used to stash there
// (the transaction cache and the "base already seeded" flag) now lives in an
// adapter-owned registry, so this covers the full scope lifecycle against it:
// seed once, reuse across requests, drop on apply.
describe("changeSet scope state", () => {
    const prepareVersionedDraft = () => {
        const rootStore = store()
        const { entityAtom: entityFamily, ...atoms } = createAtoms()
        const adapter = createValdresAdapter({
            store: rootStore,
            entityAtom: entityFamily,
            ...atoms,
            operations,
            entities,
            session: { identityRef: "User/42" },
        })
        const [post] = adapter.createPost({ title: "Host" })
        const [draft] = adapter.createDraft({ postRef: post.ref })

        // A base entity that exists ONLY in the version snapshot, so seeding it
        // into the scope is observable.
        const TS = "2020-01-01T00:00:00.000Z"
        const meta = { mutationRef: "Mutation/1", timestamp: TS }
        const basePost = {
            ref: "Post/920000000000",
            entity: "Post",
            created: meta,
            updated: meta,
            data: { title: "Base", tags: [] },
            children: { blocks: [] },
            parents: {},
            ancestors: {},
        }
        const versionRef = "PostVersion/920000000001"
        rootStore.set(entityFamily(versionRef), {
            ref: versionRef,
            entity: "PostVersion",
            created: meta,
            updated: meta,
            data: { version: 1, snapshot: [basePost] },
            children: {},
            parents: { post: basePost.ref },
            ancestors: {},
        })
        const draftDoc = rootStore.get(entityFamily(draft.ref)) as any
        rootStore.set(entityFamily(draft.ref), {
            ...draftDoc,
            parents: { ...draftDoc.parents, version: versionRef },
        })
        return {
            rootStore,
            entityFamily,
            adapter,
            post,
            draft,
            versionRef,
            basePost,
        }
    }

    test("seeds the base once per scope, not once per request", () => {
        const { rootStore, adapter, post, draft, versionRef } =
            prepareVersionedDraft()
        const loadBaseSpy = spyOn(loadChangeSetBaseModule, "loadChangeSetBase")

        // Two seeding sites, one call each: onChangeSetInit seeds the scope
        // here, and roc-db's own initializeChangeSet seeds the scope's request
        // cache on the first request below.
        const changeSetAdapter = adapter.changeSet(draft.ref)
        expect(loadBaseSpy).toHaveBeenCalledTimes(1)
        expect(
            changeSetAdapter._engineOpts.scopedStore.get(scopeBaseAtom),
        ).toEqual({ versionRef })

        changeSetAdapter.createBlockParagraph({ parentRef: post.ref })
        const callsAfterFirstRequest = loadBaseSpy.mock.calls.length

        for (let i = 0; i < 3; i++) {
            changeSetAdapter.createBlockParagraph({ parentRef: post.ref })
        }
        // Later requests reuse the scope's cache, so nothing re-seeds.
        expect(loadBaseSpy.mock.calls.length).toBe(callsAfterFirstRequest)

        // A second .changeSet() on the same ref re-enters onChangeSetInit; the
        // scope-built marker is what keeps it from seeding the base a second
        // time.
        adapter.changeSet(draft.ref)
        expect(loadBaseSpy.mock.calls.length).toBe(callsAfterFirstRequest)

        loadBaseSpy.mockRestore()
    })

    test("keeps the transaction cache alive across requests in a scope", () => {
        const { rootStore, adapter, post, draft } = prepareVersionedDraft()
        const changeSetAdapter = adapter.changeSet(draft.ref)

        changeSetAdapter.createBlockParagraph({ parentRef: post.ref })
        const cache = peekScopeState(rootStore, draft.ref)?.txnCache
        expect(cache).toBeDefined()

        changeSetAdapter.createBlockParagraph({ parentRef: post.ref })
        expect(peekScopeState(rootStore, draft.ref)?.txnCache).toBe(cache)
    })

    test("re-seeds the base when a disposed scope is re-opened", () => {
        // A disposed scope is gone for good, and the next store.scope() builds
        // an empty one under the same name. That scope has to be seeded and
        // replayed again, and the transaction cache describing the dead scope
        // has to go with it.
        const { rootStore, entityFamily, adapter, post, draft, basePost } =
            prepareVersionedDraft()
        const cs1 = adapter.changeSet(draft.ref)
        const [{ block }] = cs1.createBlockParagraph({ parentRef: post.ref })
        const scope1 = cs1._engineOpts.scopedStore
        expect(scope1.get(entityFamily(basePost.ref))).toBeDefined()
        const cache1 = peekScopeState(rootStore, draft.ref)?.txnCache
        expect(cache1).toBeDefined()

        scope1.dispose()
        // The changeSet adapter's scope is gone, so its requests fail rather
        // than write into a new, unseeded scope under the same name.
        expect(() => cs1.createBlockParagraph({ parentRef: post.ref })).toThrow(
            StoreDisposedError,
        )

        const cs2 = adapter.changeSet(draft.ref)
        const scope2 = cs2._engineOpts.scopedStore
        expect(scope2).not.toBe(scope1)
        expect(scope2.get(entityFamily(basePost.ref))).toBeDefined()
        // The draft's earlier work is replayed into the new scope.
        expect(scope2.get(entityFamily(block.ref))).toBeDefined()
        cs2.createBlockParagraph({ parentRef: post.ref })
        expect(peekScopeState(rootStore, draft.ref)?.txnCache).not.toBe(cache1)
    })

    test("seeds the base again when the seeding transaction rolled back", () => {
        // Inside a caller's transaction, onChangeSetInit seeds through that
        // transaction. If the caller then throws, the seed is discarded, and
        // the marker saying the base was seeded has to go with it.
        const { rootStore, entityFamily, adapter, draft, basePost, versionRef } =
            prepareVersionedDraft()
        const scope = rootStore.scope(draft.ref)
        expect(() =>
            rootStore.txn(txn => {
                adapter.clone({ txn }).changeSet(draft.ref)
                throw new Error("rollback")
            }),
        ).toThrow("rollback")
        expect(scope.get(scopeBaseAtom)).toBeNull()
        expect(scope.get(entityFamily(basePost.ref))).toBeUndefined()

        adapter.changeSet(draft.ref)
        expect(scope.get(scopeBaseAtom)).toEqual({ versionRef })
        expect(scope.get(entityFamily(basePost.ref))?.ref).toBe(basePost.ref)
    })

    test("leaves the scope alone when the changeSet is applied", () => {
        // Once a changeSet is applied, consumers render from the root and
        // dispose the scope. Applying neither reverts nor disposes it.
        const { rootStore, entityFamily, adapter, post, draft } =
            prepareVersionedDraft()
        const cs = adapter.changeSet(draft.ref)
        const [{ block }] = cs.createBlockParagraph({ parentRef: post.ref })
        const scopedStore = cs._engineOpts.scopedStore

        adapter.applyDraft(draft.ref)
        adapter.updatePostTitle({ ref: post.ref, title: "Renamed after apply" })

        expect(rootStore.get(entityFamily(block.ref))?.ref).toBe(block.ref)
        expect(rootStore.get(entityFamily(post.ref)).data.title).toBe(
            "Renamed after apply",
        )
        expect(scopedStore.get(entityFamily(post.ref)).data.title).toBe("Host")
    })

    test("applying a changeSet on a store-less adapter is a no-op", () => {
        // An adapter can run on a bare transaction with no store. There is no
        // scope state to drop and no handle to probe for the scope, so the
        // cleanup has nothing to do — it must not reach through the missing
        // store and throw.
        const { rootStore, adapter, post, draft } = prepareVersionedDraft()
        const cs = adapter.changeSet(draft.ref)
        cs.createBlockParagraph({ parentRef: post.ref })

        expect(() =>
            rootStore.txn(txn =>
                adapter.clone({ store: undefined, txn }).applyDraft(draft.ref),
            ),
        ).not.toThrow()
    })

    test("drops the scope's cache when the changeSet is applied", () => {
        const { rootStore, adapter, post, draft } = prepareVersionedDraft()
        const changeSetAdapter = adapter.changeSet(draft.ref)
        changeSetAdapter.createBlockParagraph({ parentRef: post.ref })
        const cache = peekScopeState(rootStore, draft.ref)?.txnCache
        expect(cache).toBeDefined()

        adapter.applyDraft(draft.ref)
        // The next request rebuilds the cache, re-verifies the changeSet and
        // rejects it as applied.
        expect(() =>
            changeSetAdapter.createBlockParagraph({ parentRef: post.ref }),
        ).toThrow(/has already been applied/)
        expect(peekScopeState(rootStore, draft.ref)?.txnCache).not.toBe(cache)
    })
})
