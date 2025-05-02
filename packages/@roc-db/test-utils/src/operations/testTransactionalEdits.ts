import { expect } from "bun:test"
import { Query, QueryChain, writeOperation } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "../schemas"

const TestCreatePatchDeleteInSameTransaction = (txn, title) => {
    const postRef = txn.createRef("Post")
    return QueryChain(
        Query(() =>
            txn.createEntity(postRef, {
                data: { title, tags: [] },
                children: { blocks: [] },
            }),
        ),
        Query(() => txn.patchEntity(postRef, { data: { foo: "bar" } })),
        Query(post => {
            expect(post.data.title).toBe(title)
            expect(post.data.foo).toBe("bar")
        }),
        Query(() =>
            txn.patchEntity(postRef, { data: { foo: null, bar: "foo" } }),
        ),
        Query(post => {
            expect(post.data.title).toBe(title)
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
const PayloadSchema = z
    .object({
        name: z.string().optional(),
        post1ref: PostRefSchema.optional(),
        post2ref: PostRefSchema.optional(),
    })
    .strict()

export const testTransactionalEdits = writeOperation(
    "testTransactionalEdits",
    PayloadSchema,
    txn => {
        const { name, post1ref, post2ref } = txn.payload
        if (name) return TestCreatePatchDeleteInSameTransaction(txn, name)
        if (post1ref) return TestUpdateAndDeleteInSameTransaction(txn, post1ref)
        if (post2ref) return TestCreateOnExistingRef(txn)
    },
    {},
)
