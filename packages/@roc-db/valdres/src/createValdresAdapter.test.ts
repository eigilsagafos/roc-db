import {
    entities,
    operations,
    testAdapterImplementation,
} from "@roc-db/test-utils"
import { describe, expect, spyOn, test } from "bun:test"
import type { Entity, Mutation, Ref } from "roc-db"
import { atomFamily, store } from "valdres"
import { createValdresAdapter } from "./createValdresAdapter"
import type { ValdresEngine } from "./types/ValdresEngine"
import * as initializeChangeSetModule from "../../../roc-db/src/lib/initializeChangeSet"
import * as loadChangeSetBaseModule from "../../../roc-db/src/lib/loadChangeSetBase"
import { peekScopeState } from "./lib/scopeState"

describe("createValdresAdapter", () => {
    testAdapterImplementation<ValdresEngine>(createValdresAdapter, () => {
        return {
            store: store(),
            // Generics are <Value, Args>: value first, key-args tuple second.
            entityAtom: atomFamily<Entity | null, [string]>(null),
            mutationAtom: atomFamily<Mutation | null, [string]>(null),
            entityUniqueAtom: atomFamily<
                Ref | null,
                [string, string, string | number | boolean]
            >(null),
            entityIndexAtom: atomFamily<
                Ref[],
                [string, string, string | number | boolean]
            >([]),
        }
    })
})

test.todo("clone with txn", () => {
    const rootStore = store()
    const entityFamily = atomFamily(null)
    const adapter = createValdresAdapter({
        store: rootStore,
        entityAtom: entityFamily,
        mutationAtom: atomFamily(null),
        operations,
        session: { identityRef: "User/42" },
        entities,
    })
    const [post1] = adapter.createPost({ title: "Foo" })

    let post2ref
    expect(() => {
        rootStore.txn(txn => {
            const clone = adapter.clone({ txn })
            const [post2] = clone.createPost({ title: "Post 2" })
            post2ref = post2.ref
            throw new Error("rollback")
        })
    }).toThrow("rollback")
    const post2read = rootStore.get(entityFamily(post2ref))
    expect(post2read).toBeNull()

    let post3ref
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
    const entityFamily = atomFamily(null)
    const adapter = createValdresAdapter({
        operations,
        entities,
        store: rootStore,
        entityAtom: entityFamily,
        mutationAtom: atomFamily(null),
        entityUniqueAtom: atomFamily(null),
        entityIndexAtom: atomFamily([]),
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
    const entityFamily = atomFamily(null)
    const mutationFamily = atomFamily(null)
    const adapter = createValdresAdapter({
        store: rootStore,
        entityAtom: entityFamily,
        mutationAtom: mutationFamily,
        entityUniqueAtom: atomFamily(null),
        entityIndexAtom: atomFamily([]),
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
    const entityFamily = atomFamily(null)
    const mutationFamily = atomFamily(null)
    const adapter = createValdresAdapter({
        store: rootStore,
        entityAtom: entityFamily,
        mutationAtom: mutationFamily,
        entityUniqueAtom: atomFamily(null),
        entityIndexAtom: atomFamily([]),
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
    const entityFamily = atomFamily(null)
    const adapter = createValdresAdapter({
        store: rootStore,
        entityAtom: entityFamily,
        mutationAtom: atomFamily(null),
        entityUniqueAtom: atomFamily(null),
        entityIndexAtom: atomFamily([]),
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
    expect(rootStore.get(entityFamily(basePost.ref))).toBeNull()

    // .changeSet() runs onChangeSetInit, which seeds the version snapshot into
    // the scoped store. Read that scoped store directly (not via readEntity,
    // which would re-seed through roc-db's initializeChangeSet) so this isolates
    // onChangeSetInit's seeding specifically.
    const cs = adapter.changeSet(draft.ref)
    const seeded = cs._engineOpts.scopedStore.get(entityFamily(basePost.ref))
    expect(seeded).not.toBeNull()
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
        const entityFamily = atomFamily<any, [string]>(null)
        const adapter = createValdresAdapter({
            store: rootStore,
            entityAtom: entityFamily,
            mutationAtom: atomFamily(null),
            entityUniqueAtom: atomFamily(null),
            entityIndexAtom: atomFamily([]),
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
        expect(peekScopeState(rootStore, draft.ref)?.versionRefLoaded).toBe(
            versionRef,
        )

        changeSetAdapter.createBlockParagraph({ parentRef: post.ref })
        const callsAfterFirstRequest = loadBaseSpy.mock.calls.length

        for (let i = 0; i < 3; i++) {
            changeSetAdapter.createBlockParagraph({ parentRef: post.ref })
        }
        // Later requests reuse the scope's cache, so nothing re-seeds.
        expect(loadBaseSpy.mock.calls.length).toBe(callsAfterFirstRequest)

        // A second .changeSet() on the same ref re-enters onChangeSetInit; the
        // registry flag is what keeps it from seeding the base a second time.
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

    test("re-seeds the base when a destroyed scope is re-opened", () => {
        // valdres destroys a scope once its last lease detaches, and rebuilds
        // an empty one on the next store.scope(). The adapter's state describes
        // the dead scope at that point, so it has to go — otherwise
        // versionRefLoaded suppresses the seed the new scope needs, and it
        // comes up without its base. The scope's onDispose hook drops it at the
        // moment the scope dies.
        const { rootStore, entityFamily, adapter, post, draft, basePost } =
            prepareVersionedDraft()
        const cs1 = adapter.changeSet(draft.ref)
        cs1.createBlockParagraph({ parentRef: post.ref })
        expect(
            cs1._engineOpts.scopedStore.get(entityFamily(basePost.ref)),
        ).not.toBeNull()

        // Release the only lease -> valdres drops the scope, taking the
        // adapter's entry for it with it.
        expect(peekScopeState(rootStore, draft.ref)).toBeDefined()
        expect(cs1._engineOpts.scopedStore.detach()).toBe(true)
        expect(peekScopeState(rootStore, draft.ref)).toBeUndefined()

        const cs2 = adapter.changeSet(draft.ref)
        expect(
            cs2._engineOpts.scopedStore.get(entityFamily(basePost.ref)),
        ).not.toBeNull()
    })

    test("stops shadowing the root once the changeSet is applied", () => {
        // The scope's values were the draft's optimistic view. Applying moves
        // that work onto the root, so the scope has to stop shadowing it or a
        // UI still rendering the draft freezes at pre-apply state forever.
        const { rootStore, entityFamily, adapter, post, draft } =
            prepareVersionedDraft()
        const cs = adapter.changeSet(draft.ref)
        cs.createBlockParagraph({ parentRef: post.ref })
        const scopedStore = cs._engineOpts.scopedStore

        adapter.applyDraft(draft.ref)
        adapter.updatePostTitle({ ref: post.ref, title: "Renamed after apply" })

        expect(rootStore.get(entityFamily(post.ref)).data.title).toBe(
            "Renamed after apply",
        )
        expect(scopedStore.get(entityFamily(post.ref)).data.title).toBe(
            "Renamed after apply",
        )
    })

    test("restores family membership the changeSet deleted", () => {
        // A draft deleting an entity `del`s it from the scope's family index,
        // and that tombstone is permanent per key: the value falls through to
        // the root again, but the member never reappears in the scope's
        // `get(family)` — so the two read paths disagree forever. Singletons
        // make it reachable, since they reuse one bare-name ref across a
        // delete/recreate cycle. unsetAll reverts membership too.
        const { rootStore, entityFamily, adapter, post, draft } =
            prepareVersionedDraft()
        adapter.createOrgSettings({ name: "Acme" })
        const cs = adapter.changeSet(draft.ref)
        const scopedStore = cs._engineOpts.scopedStore

        cs.deleteOrgSettings({})
        const settings = entityFamily("OrgSettings")
        expect(scopedStore.get(entityFamily)).not.toContain(settings)

        adapter.applyDraft(draft.ref)
        adapter.createOrgSettings({ name: "Acme again" })

        expect(rootStore.get(entityFamily)).toContain(settings)
        expect(scopedStore.get(entityFamily)).toContain(settings)
        expect(scopedStore.get(settings).data.name).toBe("Acme again")
    })

    test("drops the scope entry when the changeSet is applied", () => {
        const { rootStore, adapter, post, draft } = prepareVersionedDraft()
        const changeSetAdapter = adapter.changeSet(draft.ref)
        changeSetAdapter.createBlockParagraph({ parentRef: post.ref })
        expect(peekScopeState(rootStore, draft.ref)).toBeDefined()

        adapter.applyDraft(draft.ref)
        expect(peekScopeState(rootStore, draft.ref)).toBeUndefined()
    })
})
