import { beforeAll, describe, expect, test } from "bun:test"
import { BadRequestError, NotFoundError } from "roc-db"
import type { z } from "zod"
import { operations } from "./operations"
import {
    BlockParagraphSchema,
    CreatePostMutationSchema,
    entities,
    PostSchema,
} from "./schemas"
import type { Post } from "./schemas/PostSchema"
import type { BlockParagraph } from "./schemas/BlockParagraphSchema"
import type { BlockRow } from "./schemas/BlockRowSchema"

const prepareChangeSetTest = async adapter => {
    const [post] = await adapter.createPost({
        title: "Title 1",
        slug: "title-1",
        tags: ["Foo", "Bar"],
    })
    const [draft] = await adapter.createDraft({
        postRef: post.ref,
    })
    const changeSetAdapter = adapter.changeSet(draft.ref)
    const [{ block: blockParagraph1 }] =
        await changeSetAdapter.createBlockParagraph({
            parentRef: post.ref,
        })

    const [{ block: blockRow, updatedParent }] =
        await changeSetAdapter.createBlockRow({
            parentRef: post.ref,
        })

    const [{ block: blockParagraph2 }] =
        await changeSetAdapter.createBlockParagraph({
            parentRef: blockRow.ref,
        })

    return {
        postRef: post.ref,
        draftRef: draft.ref,
        changeSetAdapter,
        blockParagraph1,
        blockParagraph2,
        blockRow,
        post: updatedParent,
    }

    // blockParagraph2 = createParagraph2Res.block
}

export const testAdapterImplementation = <EngineOptions extends {}>(
    adapterConstructor,
    engineArgsAdapter1: EngineOptions = {},
    engineArgsAdapter2: EngineOptions = {},
) => {
    return async () => {
        const adapter1 = adapterConstructor(
            {
                operations,
                entities,
                session: { identityRef: "User/42" },
                ...engineArgsAdapter1,
            },
            // engineArgsAdapter1,
        )
        const adapter2 = adapterConstructor(
            {
                operations,
                entities,
                session: { identityRef: "User/42" },
                ...engineArgsAdapter2,
            },
            // engineArgsAdapter2,
        )

        describe("Post CRUD", async () => {
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

            test("update (updateEntity function)", async () => {
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
                const updatePostTitleRes1 = await adapter1.updatePostTitle({
                    ref: postRef,
                    title: "Title 3",
                })
                expect(updatePostTitleRes1[0]).toMatchZodSchema(PostSchema)
                const updatePostTitleRes2 = await adapter1.updatePostTitle({
                    ref: postRef,
                    title: "Title 4",
                })
                expect(updatePostTitleRes2[0]).toMatchZodSchema(PostSchema)
                expect(updatePostTitleRes2[1].ref).toBe(
                    updatePostTitleRes1[1].ref,
                )
                expect(
                    updatePostTitleRes2[1].timestamp >=
                        updatePostTitleRes1[1].timestamp,
                ).toBeTrue()
            })

            test("delete (deleteEntity function)", async () => {
                const [count, mutation] = await adapter1.deletePost(postRef)
                expect(count).toBe(1)
                expect(mutation.log).toStrictEqual([[postRef, "delete", null]])
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
        })

        describe("changeSet", async () => {
            let postRef: string,
                draftRef: string,
                changeSetAdapter,
                blockParagraph1: BlockParagraph,
                post: Post,
                blockRow: BlockRow,
                blockParagraph2: BlockParagraph
            beforeAll(async () => {
                ;({
                    postRef,
                    draftRef,
                    changeSetAdapter,
                    blockParagraph1,
                    post,
                    blockRow,
                    blockParagraph2,
                } = await prepareChangeSetTest(adapter1))
            })

            test("create (createEntity function w/changeSetRef)", async () => {
                expect(blockParagraph1).toMatchZodSchema(BlockParagraphSchema)
                expect(post).toMatchZodSchema(PostSchema)
            })

            test("read (readEntity function w/changeSetRef)", async () => {
                const read = await changeSetAdapter.readEntity(
                    blockParagraph1.ref,
                )
                expect(read).toMatchZodSchema(BlockParagraphSchema)
            })

            test("update (patchEntity function w/changeSetRef)", async () => {
                const [updatedBlock] =
                    await changeSetAdapter.updateBlockParagraph({
                        ref: blockParagraph1.ref,
                        content: "Hello, world!",
                    })
                expect(updatedBlock).toMatchZodSchema(BlockParagraphSchema)
            })

            test("delete (with cascade delete)", async () => {
                const [count, mutation] =
                    await changeSetAdapter.deletePost(postRef)

                expect(count).toBe(4)
                expect(mutation.log).toStrictEqual([
                    [blockParagraph1.ref, "delete", draftRef],
                    [blockParagraph2.ref, "delete", draftRef],
                    [blockRow.ref, "delete", draftRef],
                    [postRef, "delete", draftRef],
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

            describe("create and apply draft", () => {
                test("applyDraft", async () => {
                    const { draftRef } = await prepareChangeSetTest(adapter1)
                    const [version, mutation] = await adapter1.applyDraft({
                        ref: draftRef,
                    })
                })
            })
        })
    }
}
