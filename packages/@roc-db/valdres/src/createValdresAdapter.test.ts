import {
    entities,
    operations,
    testAdapterImplementation,
} from "@roc-db/test-utils"
import { describe, expect, spyOn, test } from "bun:test"
import type { Entity, Mutation, MutationRef, Ref } from "roc-db"
import { atomFamily, store } from "valdres"
import { createValdresAdapter } from "./createValdresAdapter"
import type { ValdresEngine } from "./types/ValdresEngine"
import * as initializeChangeSetModule from "../../../roc-db/src/lib/initializeChangeSet"

describe("createValdresAdapter", () => {
    testAdapterImplementation<ValdresEngine>(createValdresAdapter, () => {
        return {
            store: store(),
            entityAtom: atomFamily<Ref, Entity | null>(null),
            mutationAtom: atomFamily<MutationRef, Mutation | null>(null),
            entityUniqueAtom: atomFamily<Ref, Entity | null>(null),
            entityIndexAtom: atomFamily<Ref[], [string, string, any]>([]),
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

const prepareChangeSetTest = () => {
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
    const changeSetAdapter = adapter.changeSet(draft.ref)
    return {
        adapter,
        post,
        draft,
        changeSetAdapter,
    }
}

test("duplicateDraft (txn.duplicateChangeSetMutations) clones a changeSet with remapped refs", () => {
    const { adapter, post, draft, changeSetAdapter } = prepareChangeSetTest()
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
