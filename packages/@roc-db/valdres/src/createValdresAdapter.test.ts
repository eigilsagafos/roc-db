import {
    entities,
    operations,
    testAdapterImplementation,
} from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import type { Entity, Mutation, MutationRef, Ref } from "roc-db"
import { atomFamily, store } from "valdres"
import { createValdresAdapter } from "./createValdresAdapter"
import type { ValdresEngine } from "./types/ValdresEngine"

describe("createValdresAdapter", () => {
    testAdapterImplementation<ValdresEngine>(createValdresAdapter, () => {
        return {
            store: store(),
            entityAtom: atomFamily<Ref, Entity | null>(null),
            mutationAtom: atomFamily<MutationRef, Mutation | null>(null),
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
        session: { identityRef: "User/42" },
    })
    const [post] = adapter.createPost({ title: "Foo" })
    const [draft] = adapter.createDraft({
        postRef: post.ref,
    })
    const changeSetAdapter = adapter.changeSet(draft.ref)

    const [{ block }] = changeSetAdapter.createBlockParagraph({
        parentRef: post.ref,
    })

    const draftStore = rootStore.scope(draft.ref)

    const res = draftStore.get(entityFamily(block.ref))
    expect(res?.ref).toBe(block.ref)
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
