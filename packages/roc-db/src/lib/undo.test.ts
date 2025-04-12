import { inMemoryAdapter } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { NotFoundError } from "../errors/NotFoundError"
// import { InMemoryAdapter } from "./inMemoryAdapter"
describe("undo", () => {
    test("undo create", () => {
        const [post1] = inMemoryAdapter.createPost({
            title: "Post 1",
            tags: [],
        })

        const [, undoMutation] = inMemoryAdapter.undo()
        expect(undoMutation.log).toHaveLength(1)
        expect(undoMutation.log[0][0]).toBe(post1.ref)
        expect(undoMutation.log[0][1]).toBe("delete")
    })

    test("undo delete", () => {
        const [post1] = inMemoryAdapter.createPost({
            title: "Post 1",
            tags: [],
        })

        expect(inMemoryAdapter.readEntity(post1.ref).data.title).toBe("Post 1")
        const [, deleteMutation] = inMemoryAdapter.deletePost(post1.ref)
        expect(() => inMemoryAdapter.readEntity(post1.ref)).toThrow(
            NotFoundError,
        )
        const [, undoMutation] = inMemoryAdapter.undo()
        expect(inMemoryAdapter.readEntity(post1.ref).data.title).toBe("Post 1")
    })

    test("foo", () => {
        const [post] = inMemoryAdapter.createPost({
            title: "Post 1",
            tags: [],
        })

        const [draft] = inMemoryAdapter.createDraft({
            postRef: post.ref,
        })

        const changeSetAdapter = inMemoryAdapter.changeSet(draft.ref)

        const [{ block: block1 }] = changeSetAdapter.createBlockParagraph({
            parentRef: post.ref,
        })
        const [{ block: block2 }] = changeSetAdapter.createBlockParagraph({
            parentRef: post.ref,
        })

        const postRead1 = changeSetAdapter.readEntity(post.ref)
        changeSetAdapter.undo()
        const postRead2 = changeSetAdapter.readEntity(post.ref)
    })
})

// test("undo", () => {
//     const [post1, mu] = inMemoryAdapter.createPost({ title: "F", tags: [] })
//     const [post1Update1, updateMutation1] = inMemoryAdapter.updatePostTitle(
//         {
//             ref: post1.ref,
//             title: "Fo",
//         },
//     )
//     expect(updateMutation1.identityRef).toBe("User/42")
//     expect(updateMutation1.debounceCount).toBe(0)
//     const [post1Update2, updateMutation2] = inMemoryAdapter.updatePostTitle(
//         {
//             ref: post1.ref,
//             title: "Foo",
//         },
//     )
//     expect(updateMutation2.debounceCount).toBe(1)

//     const undoRes1 = inMemoryAdapter.undo()
//     const readRes = inMemoryAdapter.readEntity(post1.ref)
//     expect(readRes.data.title).toBe("Fo")
// })
