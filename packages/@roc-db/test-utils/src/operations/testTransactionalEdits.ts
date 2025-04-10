import { Query, QueryChain, writeOperation } from "roc-db"
import { TestTransactionalEditsMutationSchema } from "../schemas/TestTransactionalEditsMutationSchema"
import { PostSchema } from "../schemas"
import { expect } from "bun:test"

const TestCreatePatchDeleteInSameTransaction = (txn, name) => {
    const postRef = txn.createRef("Post")
    QueryChain(
        Query(() => txn.createEntity(postRef, { data: { name: name } })),
        Query(() => txn.patchEntity(postRef, { data: { foo: "bar" } })),
        Query(post => {
            expect(post.data.name).toBe(name)
            expect(post.data.foo).toBe("bar")
        }),
        Query(() =>
            txn.patchEntity(postRef, { data: { foo: null, bar: "foo" } }),
        ),
        Query(post => {
            expect(post.data.name).toBe(name)
            expect(post.data.foo).toBeUndefined()
            expect(post.data.bar).toBe("foo")
            expect(txn.log).toHaveLength(1)
            expect(txn.log.get(postRef)[0]).toBe("create")
        }),
        Query(post => txn.deleteEntity(postRef)),
        Query(res => {
            expect(res).toBe(1)
            expect(txn.log).toHaveLength(0)
        }),
    )
}

const TestUpdateAndDeleteInSameTransaction = (txn, ref) => {
    return QueryChain(
        Query(() => txn.patchEntity(ref, { data: { foo: "bar" } })),
        Query(post => {
            expect(post.data.foo).toBe("bar")
        }),
        Query(() => txn.patchEntity(ref, { data: { foo: null, bar: "foo" } })),
        Query(post => {
            expect(post.data.foo).toBeUndefined()
            expect(post.data.bar).toBe("foo")
            expect(txn.log).toHaveLength(1)
            expect(txn.log.get(ref)[0]).toBe("update")
        }),
        Query(post => txn.deleteEntity(ref)),
        Query(res => {
            expect(res).toBe(1)
            expect(txn.log).toHaveLength(1)
            expect(txn.log.get(ref)[0]).toBe("delete")
        }),
    )
}

const TestCreateOnExistingRef = txn => {
    const ref = txn.createRef("Post")
    return QueryChain(
        Query(() => txn.createEntity(ref, { data: { foo: "bar" } })),
        Query(() => txn.createEntity(ref, { data: { foo: "bar" } })),
    )
}

export const testTransactionalEdits = writeOperation(
    TestTransactionalEditsMutationSchema,
    PostSchema,
    txn => {
        const { name, post1ref, post2ref } = txn.payload
        if (name) return TestCreatePatchDeleteInSameTransaction(txn, name)
        if (post1ref) return TestUpdateAndDeleteInSameTransaction(txn, post1ref)
        if (post2ref) return TestCreateOnExistingRef(txn)
        // return
    },
    {},
)
