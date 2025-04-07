import { beforeAll, describe, expect, test } from "bun:test"
import { BadRequestError, NotFoundError } from "roc-db"
import type { z } from "zod"
import { operations } from "./operations"
import {
    BlockParagraphSchema,
    CreatePostMutationSchema,
    entities,
    PostSchema,
    UpdatePostTitleMutationSchema,
} from "./schemas"
import type { Post } from "./schemas/PostSchema"
import type { BlockParagraph } from "./schemas/BlockParagraphSchema"
import type { BlockRow } from "./schemas/BlockRowSchema"

const prepareChangeSetTest = async (adapter, adapter2) => {
    const [post, createPostMutation] = await adapter.createPost({
        title: "Title 1",
        slug: "title-1",
        tags: ["Foo", "Bar"],
    })
    expect(createPostMutation.log).toStrictEqual([[post.ref, "create"]])
    const [draft, createDraftMutation] = await adapter.createDraft({
        postRef: post.ref,
    })
    expect(createDraftMutation.log).toStrictEqual([[draft.ref, "create"]])
    const changeSetAdapter = adapter.changeSet(draft.ref)

    const [
        { block: blockParagraph1, updatedParent: updatedPost },
        createBlockParagraphMutation,
    ] = await changeSetAdapter.createBlockParagraph({
        parentRef: post.ref,
    })
    expect(updatedPost.children.blocks).toStrictEqual([blockParagraph1.ref])
    expect(updatedPost.children.blocks).toHaveLength(1)
    expect(
        createBlockParagraphMutation.log[0][2].children.blocks,
    ).toStrictEqual([])

    const readPost1 = await changeSetAdapter.readEntity(post.ref)
    expect(readPost1.children.blocks).toHaveLength(1)
    // expect(readPost1.children.blocks).toStrictEqual([blockParagraph1.ref])
    const [{ block: blockRow, updatedParent: updatedPost2 }, mutation] =
        await changeSetAdapter.createBlockRow({
            parentRef: post.ref,
        })
    expect(updatedPost2.children.blocks).toHaveLength(2)

    const readPost2 = await changeSetAdapter.readEntity(post.ref)
    expect(readPost2.children.blocks).toHaveLength(2)

    const [{ block: blockParagraph2, updatedParent: updatedBlockRow }] =
        await changeSetAdapter.createBlockParagraph({
            parentRef: blockRow.ref,
        })
    const readPost3 = await changeSetAdapter.readEntity(post.ref)
    expect(readPost3.children.blocks).toHaveLength(2)

    return {
        postRef: post.ref,
        draftRef: draft.ref,
        changeSetAdapter,
        blockParagraph1,
        blockParagraph2,
        blockRow: updatedBlockRow,
        draft,
        post: readPost3,
    }
}

export const testAdapterImplementation = async <EngineOptions extends {}>(
    adapterConstructor,
    generateArgs: () => EngineOptions,
) => {
    let createAdapter = async () => {
        return adapterConstructor({
            operations,
            entities,
            session: { identityRef: "User/42" },
            ...(await generateArgs()),
        })
    }

    let adapter1, adapter2
    beforeAll(async () => {
        adapter1 = await createAdapter()
        adapter2 = await createAdapter()
    })

    describe("Post CRUD", () => {
        let postRef: string
        let post: z.infer<typeof PostSchema>
        let createPostMutation: z.infer<typeof CreatePostMutationSchema>
        beforeAll(async () => {
            const createPostRes = await adapter1.createPost({
                title: "Title 1",
                slug: "title-1",
                tags: ["Foo", "Bar"],
            })
            post = createPostRes[0]
            postRef = createPostRes[0].ref
            createPostMutation = createPostRes[1]
        })

        test("create (createEntity function)", async () => {
            expect(post).toMatchZodSchema(PostSchema)
            expect(post.data.title).toBe("Title 1")
            expect(post.data.tags).toStrictEqual(["Foo", "Bar"])
            expect(createPostMutation).toMatchZodSchema(
                CreatePostMutationSchema,
            )
        })

        test("read (readEntity function)", async () => {
            const readPostRes = await adapter1.readPost(postRef)
            expect(readPostRes.data.title).toStrictEqual("Title 1")
            expect(readPostRes.data.tags).toStrictEqual(["Foo", "Bar"])
            expect(readPostRes).toMatchZodSchema(PostSchema)
        })

        test("read not found (readEntity function)", async () => {
            expect(() => adapter1.readPost("Post/999")).toThrow(NotFoundError)
        })

        test.todo("update (updateEntity function)", async () => {
            const [post] = await adapter1.updatePost({
                ref: postRef,
                title: "Title 2",
                tags: ["Foo"],
            })
            expect(post.data.tags).toStrictEqual(["Foo"])
            expect(post.data.title).toBe("Title 2")
            expect(post).toMatchZodSchema(PostSchema)
        })

        test("updateTitle (patchEntity function + debounce)", async () => {
            const [update1, mutation1] = await adapter1.updatePostTitle({
                ref: postRef,
                title: "Title 3",
            })
            expect(update1).toMatchZodSchema(PostSchema)
            expect(mutation1).toMatchZodSchema(UpdatePostTitleMutationSchema)
            const [update2, mutation2] = await adapter1.updatePostTitle({
                ref: postRef,
                title: "Title 4",
            })
            expect(update2).toMatchZodSchema(PostSchema)
            expect(mutation2).toMatchZodSchema(UpdatePostTitleMutationSchema)
            expect(mutation1.ref).toBe(mutation2.ref)
            expect(mutation2.timestamp >= mutation1.timestamp).toBeTrue()
        })

        test("updatePostDescription without changeSetAdapter fails with BadRequestError", async () => {
            expect(() =>
                adapter1.updatePostDescription({
                    ref: postRef,
                    description: "Description 1",
                }),
            ).toThrow(BadRequestError)
        })

        test("delete (deleteEntity function)", async () => {
            const currentPost = await adapter1.readPost(postRef)
            expect(currentPost.ref).toBe(postRef)
            const [count, mutation] = await adapter1.deletePost(postRef)
            expect(count).toBe(1)
            expect(mutation.log).toStrictEqual([
                [postRef, "delete", currentPost],
            ])
            expect(() => adapter1.readPost(postRef)).toThrow(NotFoundError)
        })

        test("sync mutation", async () => {
            const res =
                await adapter2.syncOptimisticMutation(createPostMutation)
            expect(res[0]).toStrictEqual(post)
            expect(res[1]).toStrictEqual(createPostMutation)
            expect(() =>
                adapter2.syncOptimisticMutation(createPostMutation),
            ).toThrowError(BadRequestError)
        })

        test("create, patch and delete the same item within the same transaction", async () => {
            const [post1] = await adapter1.createPost({ title: "Post 1" })
            const [post2] = await adapter1.createPost({ title: "Post 1" })
            const [currentPost, mutation] =
                await adapter1.testTransactionalEdits({
                    name: "Test",
                    // post1ref: post1.ref,
                    // post2ref: post2.ref,
                })
            expect(mutation.log).toHaveLength(0)
            const [, mutation2] = await adapter1.testTransactionalEdits({
                post1ref: post1.ref,
            })
            expect(mutation2.log).toHaveLength(1)
            expect(mutation2.log[0][1]).toBe("delete")
            expect(() =>
                adapter1.testTransactionalEdits({
                    post2ref: post2.ref,
                }),
            ).toThrow(BadRequestError)
        })
    })

    describe("changeSet", () => {
        let postRef: string,
            draftRef: string,
            changeSetAdapter,
            blockParagraph1: BlockParagraph,
            post: Post,
            blockRow: BlockRow,
            blockParagraph2: BlockParagraph,
            draft
        beforeAll(async () => {
            ;({
                postRef,
                draftRef,
                changeSetAdapter,
                blockParagraph1,
                post,
                blockRow,
                blockParagraph2,
                draft,
            } = await prepareChangeSetTest(adapter1, adapter2))
        })

        test("create (createEntity function w/changeSetRef)", async () => {
            expect(blockParagraph1).toMatchZodSchema(BlockParagraphSchema)
            expect(post).toMatchZodSchema(PostSchema)
        })

        test("read (readEntity function w/changeSetRef)", async () => {
            const read = await changeSetAdapter.readEntity(blockParagraph1.ref)
            expect(read).toMatchZodSchema(BlockParagraphSchema)
        })

        test("update (patchEntity function w/changeSetRef)", async () => {
            const [updatedBlock] = await changeSetAdapter.updateBlockParagraph({
                ref: blockParagraph1.ref,
                content: "Hello, world!",
            })
            expect(updatedBlock).toMatchZodSchema(BlockParagraphSchema)
        })

        test("move (batchReadEntities function)", async () => {
            const res = await changeSetAdapter.moveBlocks({
                refs: [blockParagraph1.ref],
                targetPosition: 1,
            })
            // expect(updatedBlock).toMatchZodSchema(BlockParagraphSchema)
            // const readPost = await changeSetAdapter.readEntity(postRef)
            // expect(readPost.children.blocks).toHaveLength(3)
        })

        test("delete (with cascade delete)", async () => {
            const postUpdated = await changeSetAdapter.readEntity(postRef)
            const blockParagraph1Update = await changeSetAdapter.readEntity(
                blockParagraph1.ref,
            )
            const blockRowUpdated = await changeSetAdapter.readEntity(
                blockRow.ref,
            )
            const [count, mutation] = await changeSetAdapter.deletePost(postRef)
            expect(count).toBe(4)
            expect(mutation.log).toStrictEqual([
                [blockParagraph1.ref, "delete", blockParagraph1Update],
                [blockParagraph2.ref, "delete", blockParagraph2],
                [blockRow.ref, "delete", blockRowUpdated],
                [postRef, "delete", postUpdated],
            ])

            await expect(() =>
                changeSetAdapter.readEntity(blockParagraph1.ref),
            ).toThrow(NotFoundError)

            await expect(() =>
                changeSetAdapter.updateBlockParagraph({
                    ref: blockParagraph1.ref,
                    content: "Foo",
                }),
            ).toThrow(NotFoundError)
        })

        test("pageMutations", async () => {
            const res = await changeSetAdapter.pageMutations({
                changeSetRef: draftRef,
            })
            expect(res.length).toBeGreaterThan(0)
            expect(res.every(m => m.changeSetRef === draftRef)).toBeTrue()
        })
        test("pageMutations run again", async () => {
            const res = await changeSetAdapter.pageMutations({
                changeSetRef: draftRef,
            })
            expect(res.length).toBeGreaterThan(0)
            expect(res.every(m => m.changeSetRef === draftRef)).toBeTrue()
        })

        test("invalid changeSetRef throws error", async () => {
            const changeSetAdapter = adapter1.changeSet("Draft/123")
            expect(() =>
                changeSetAdapter.createPost({ title: "Title 1" }),
            ).toThrow(BadRequestError)
        })

        test("applyDraft", async () => {
            const { draftRef } = await prepareChangeSetTest(adapter1)
            const [version, mutation] = await adapter1.applyDraft({
                ref: draftRef,
            })
        })

        test("init adapter2", async () => {
            const adapterA = await createAdapter()
            const adapterB = await createAdapter()

            const { draftRef } = await prepareChangeSetTest(adapterA, adapterB)
            const mutations = await adapterA.pageMutations({
                changeSetRef: draftRef,
            })
            const allMutationsAdapter1 = await adapterA.pageMutations({})
            const allMutationsAdapter2 = await adapterB.pageMutations({})
            expect(allMutationsAdapter1).not.toBeEmpty()
            expect(allMutationsAdapter2).toBeEmpty()
            const res =
                await adapterB.loadOptimisticMutations(allMutationsAdapter1)
            // console.log(res)
            const allMutationsAdapter2after = await adapterB.pageMutations({})
            expect(allMutationsAdapter2after.length).toBe(
                allMutationsAdapter1.length,
            )
            const res2 =
                await adapterB.loadOptimisticMutations(allMutationsAdapter1)
        })
    })
    // }
}
