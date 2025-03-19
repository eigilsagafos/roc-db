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

describe(
    "createValdresAdapter",
    testAdapterImplementation<ValdresEngine>(
        createValdresAdapter,
        {
            store: store(),
            entityAtom: atomFamily<Ref, Entity | null>(null),
            mutationAtom: atomFamily<MutationRef, Mutation | null>(null),
        },
        {
            store: store(),
            entityAtom: atomFamily(null),
            mutationAtom: atomFamily(null),
        },
    ),
)

test("clone with txn", () => {
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
