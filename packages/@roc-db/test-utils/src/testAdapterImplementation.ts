import { beforeAll, describe, expect, test } from "bun:test"
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
    Snowflake,
} from "roc-db"
import type { z } from "zod"
import { faker } from "@faker-js/faker"
import { operations } from "./operations"
import {
    CreatePostMutationSchema,
    PostSchema,
    UpdatePostTitleMutationSchema,
} from "./schemas"
import { entities } from "./entities"
// import type { Post } from "./schemas/PostSchema"
import type { BlockParagraph } from "./schemas/BlockParagraphSchema"
import type { BlockRow } from "./schemas/BlockRowSchema"
import { PostEntity } from "./entities/PostEntity"
import { BlockParagraph, BlockParagraph } from "./entities/BlockParagraph"

const snowflake = new Snowflake(10, 10)

const prepareChangeSetTest = async (adapter, adapter2) => {
    const [post, createPostMutation] = await adapter.createPost({
        title: "Title 1",
        slug: faker.lorem.slug(5),
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
    let createAdapter = async ({ optimistic = false } = {}) => {
        return adapterConstructor({
            operations,
            entities,
            session: { identityRef: "User/42" },
            snowflake,
            optimistic,
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
                slug: faker.lorem.slug(5),
                tags: ["Foo", "Bar"],
            })
            post = createPostRes[0]
            postRef = createPostRes[0].ref
            createPostMutation = createPostRes[1]
        })

        test("create (createEntity function)", async () => {
            expect(post).toMatchZodSchema(PostEntity.schema)
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
            expect(readPostRes).toMatchZodSchema(PostEntity.schema)
        })

        test("read by unique", async () => {
            const readPostRes = await adapter1.readPostBySlug(post.data.slug)
            expect(readPostRes.data.title).toStrictEqual("Title 1")
            expect(readPostRes.data.tags).toStrictEqual(["Foo", "Bar"])
            expect(readPostRes.data.slug).toStrictEqual(post.data.slug)
        })

        test("create with same slug", async () => {
            expect(() =>
                adapter1.createPost({
                    title: "Title 2",
                    slug: post.data.slug,
                    tags: ["Foo", "Bar"],
                }),
            ).toThrow(ConflictError)
        })

        test("update unique slug", async () => {
            const slug1 = faker.lorem.slug(5)
            const slug2 = faker.lorem.slug(5)
            const [post] = await adapter1.createPost({
                title: "Title 1",
                slug: slug1,
            })
            const readPostRes1 = await adapter1.readPostBySlug(slug1)
            expect(readPostRes1.data.slug).toStrictEqual(slug1)
            const [updateRes] = await adapter1.updatePostSlug({
                ref: post.ref,
                slug: slug2,
            })
            expect(updateRes.data.slug).toStrictEqual(slug2)
            expect(() => adapter1.readPostBySlug(slug1)).toThrow(NotFoundError)
            const readPostRes2 = await adapter1.readPostBySlug(slug2)
            expect(readPostRes2.data.slug).toStrictEqual(slug2)
        })

        test("update index entries", async () => {
            const [post] = await adapter1.createPost({
                title: "Title 1",
                tags: ["foo"],
            })
            const pageTagFoo1 = await adapter1.pagePostsByTag("foo")
            expect(pageTagFoo1.length).toBe(1)
            expect(pageTagFoo1[0].ref).toBe(post.ref)

            const [updatedRes] = await adapter1.updatePostTags({
                ref: post.ref,
                tags: ["bar"],
            })
            const pageTagFoo2 = await adapter1.pagePostsByTag("foo")
            expect(pageTagFoo2.length).toBe(0)
            const pageTagBar1 = await adapter1.pagePostsByTag("bar")
            expect(pageTagBar1.length).toBe(1)
            await adapter1.deletePost(post.ref)
            const pageTagBar2 = await adapter1.pagePostsByTag("bar")
            expect(pageTagBar2.length).toBe(0)
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
            expect(post).toMatchZodSchema(PostEntity.schema)
        })

        test("updateTitle (patchEntity function + debounce)", async () => {
            const [update1, mutation1] = await adapter1.updatePostTitle({
                ref: postRef,
                title: "Title 3",
            })
            expect(update1).toMatchZodSchema(PostEntity.schema)
            expect(mutation1).toMatchZodSchema(UpdatePostTitleMutationSchema)
            const [update2, mutation2] = await adapter1.updatePostTitle({
                ref: postRef,
                title: "Title 4",
            })
            expect(update2).toMatchZodSchema(PostEntity.schema)
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
            const [{ persistedAt, ...mutation }] =
                await adapter2.persistOptimisticMutations([createPostMutation])
            // expect(res[0]).toStrictEqual(post)
            expect(mutation).toStrictEqual(createPostMutation)
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

    describe("paging", () => {
        let adapter
        let post1ref
        beforeAll(async () => {
            adapter = await createAdapter()
            const [post1] = await adapter.createPost({ title: "Post 1" })
            post1ref = post1.ref
            const [user] = await adapter.createUser({ email: "foo@bar.com" })
            const [draft1] = await adapter.createDraft({
                postRef: post1.ref,
            })
            const [post2] = await adapter.createPost({ title: "Post 2" })
            const [draft2] = await adapter.createDraft({
                postRef: post2.ref,
            })
            const draft1adapter = adapter.changeSet(draft1.ref)
            await draft1adapter.createBlockImage({
                parentRef: post1.ref,
                url: "https://example.com/image.png",
            })
            await draft1adapter.createBlockParagraph({
                parentRef: post1.ref,
            })
            await adapter.applyDraft(draft1.ref)
            const draft2adapter = adapter.changeSet(draft2.ref)
            await draft2adapter.createBlockImage({
                parentRef: post2.ref,
                url: "https://example.com/image.png",
            })
            await draft2adapter.createBlockParagraph({
                parentRef: post2.ref,
            })
            await adapter.applyDraft(draft2.ref)
        })
        test("limited to given collection", async () => {
            const res = await adapter.pagePosts()
            expect(res).toHaveLength(2)
        })
        test("limit", async () => {
            const res = await adapter.pagePosts({ size: 1 })
            expect(res).toHaveLength(1)
        })

        test("pageSplat", async () => {
            const res = await adapter.pageSplat({})
            expect(res).toHaveLength(11)
        })
        test("pageEmptyEntitiesArray", async () => {
            const res = await adapter.pageEmptyEntitiesArray({})
            expect(res).toHaveLength(0)
        })
        test("pageBlocks", async () => {
            const res = await adapter.pageBlocks({})
            expect(res).toHaveLength(4)
        })
        test("pageBlocks with parent ref", async () => {
            const res = await adapter.pageBlocks({ parentRef: post1ref })
            expect(res).toHaveLength(2)
            expect(res[0].parents.parent).toBe(post1ref)
            expect(res[1].parents.parent).toBe(post1ref)
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
            expect(blockParagraph1).toMatchZodSchema(BlockParagraph.schema)
            expect(post).toMatchZodSchema(PostEntity.schema)
        })

        test("read (readEntity function w/changeSetRef)", async () => {
            const read = await changeSetAdapter.readEntity(blockParagraph1.ref)
            expect(read).toMatchZodSchema(BlockParagraph.schema)
        })

        test("update (patchEntity function w/changeSetRef)", async () => {
            const [updatedBlock] = await changeSetAdapter.updateBlockParagraph({
                ref: blockParagraph1.ref,
                content: "Hello, world!",
            })
            expect(updatedBlock).toMatchZodSchema(BlockParagraph.schema)
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

        test("deleteBlocks (patch running 2 times removing on array element every time)", async () => {
            const [post, createPostMutation] = await adapter1.createPost({
                title: "Title 1",
                slug: faker.lorem.slug(5),
                tags: ["Foo", "Bar"],
            })
            const [draft, createDraftMutation] = await adapter1.createDraft({
                postRef: post.ref,
            })
            const changeSetAdapter = adapter1.changeSet(draft.ref)

            const [{ block: blockParagraph1 }, createBlockParagraph1Mutation] =
                await changeSetAdapter.createBlockParagraph({
                    parentRef: post.ref,
                })
            const [{ block: blockParagraph2 }, createBlockParagraph2Mutation] =
                await changeSetAdapter.createBlockParagraph({
                    parentRef: post.ref,
                })

            const readPost = await changeSetAdapter.readEntity(post.ref)
            expect(readPost.children.blocks).toEqual([
                blockParagraph1.ref,
                blockParagraph2.ref,
            ])
            const [, deleteMutation] = await changeSetAdapter.deleteBlocks([
                blockParagraph1.ref,
                blockParagraph2.ref,
            ])
            expect(deleteMutation.log[0][2].children.blocks).toEqual([
                blockParagraph1.ref,
                blockParagraph2.ref,
            ])
            expect(deleteMutation.log[0][2].updated.mutationRef).toBe(
                createBlockParagraph2Mutation.ref,
            )

            const readPost2 = await changeSetAdapter.readEntity(post.ref)
            expect(readPost2.updated.mutationRef).toEqual(deleteMutation.ref)
        })

        test("applyDraft", async () => {
            const { draftRef, post, changeSetAdapter } =
                await prepareChangeSetTest(adapter1)
            const [version, mutation] = await adapter1.applyDraft(draftRef)
            // console.log(version)
            expect(() =>
                changeSetAdapter.createBlockImage({
                    parentRef: post.ref,
                    url: "https://example.com/image.png",
                }),
            ).toThrowError("The provided changeSetRef has already been applied")
        })

        test("deleteDraft", async () => {
            const { draftRef } = await prepareChangeSetTest(adapter1)
            const mutationsBefore = await adapter1.pageMutations({
                changeSetRef: draftRef,
            })
            const [, mutation] = await adapter1.deleteDraft(draftRef)
            expect(mutation.log).toHaveLength(mutationsBefore.length + 1)
            const mutationsAfter = await adapter1.pageMutations({
                changeSetRef: draftRef,
            })
            expect(mutationsAfter).toHaveLength(0)
        })

        test("init adapter2", async () => {
            const adapterA = await createAdapter({ optimistic: true })
            const adapterB = await createAdapter({ optimistic: true })

            const { draftRef } = await prepareChangeSetTest(adapterA, adapterB)
            const mutations = await adapterA.pageMutations({
                changeSetRef: draftRef,
            })
            const allMutationsAdapter1 = await adapterA.pageMutations({})
            const allMutationsAdapter2 = await adapterB.pageMutations({})
            expect(allMutationsAdapter1).not.toBeEmpty()
            expect(allMutationsAdapter2).toBeEmpty()
            const res = await adapterB.loadMutations(allMutationsAdapter1)
            // console.log(res)
            const allMutationsAdapter2after = await adapterB.pageMutations({})
            expect(allMutationsAdapter2after.length).toBe(
                allMutationsAdapter1.length,
            )
            const res2 = await adapterB.loadMutations(allMutationsAdapter1)
        })

        test("persistOptimisticMutations", async () => {
            const persistedAdapter = await createAdapter({ optimistic: false })
            const optimisticAdapter = await createAdapter({ optimistic: true })
            expect(persistedAdapter.persistOptimisticMutations).toBeDefined()
            expect(optimisticAdapter.loadMutations).toBeDefined()

            const [post, createPostMutation] =
                await optimisticAdapter.createPost({
                    title: "Foo",
                    slug: faker.lorem.slug(5),
                    tags: [],
                })
            const [persistCratePostMutation] =
                await persistedAdapter.persistOptimisticMutations([
                    createPostMutation,
                ])
            expect(
                persistCratePostMutation.persistedAt >=
                    createPostMutation.timestamp,
            ).toBeTrue()
            const readMutation = await persistedAdapter.readMutation(
                persistCratePostMutation.ref,
            )
            expect(readMutation).toStrictEqual(persistCratePostMutation)

            const [draft, createDraftMutation] =
                await optimisticAdapter.createDraft({
                    postRef: post.ref,
                })
            const [{ persistedAt, ...persistedCreateDraftMutation }] =
                await persistedAdapter.persistOptimisticMutations([
                    createDraftMutation,
                ])
            expect(persistedCreateDraftMutation).toStrictEqual(
                createDraftMutation,
            )
            const changeSetAdapter = optimisticAdapter.changeSet(draft.ref)
            const [res] = await changeSetAdapter.createBlockParagraph({
                parentRef: post.ref,
            })

            // console.log(res)

            // // const [...res] = await changeSetAdatper.createBlockParagraph({
            // //     parentRef: post.ref,
            // // })
            // console.log(res)
        })
    })
}
