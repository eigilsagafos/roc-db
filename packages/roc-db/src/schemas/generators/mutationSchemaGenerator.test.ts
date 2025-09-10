import { test } from "bun:test"
import { z } from "zod"
import { expectTypeOf } from "expect-type"
import { mutationSchemaGenerator } from "./mutationSchemaGenerator"

test("createMutationSchema", () => {
    const name = "createPost"
    const payloadSchema = z.object({ title: z.string() })
    const createPost = mutationSchemaGenerator(name, payloadSchema)
    type CreatePostMutationSchema = z.infer<typeof createPost>

    expectTypeOf({
        ref: "Mutation/12" as const,
        name: "createPost" as const,
        timestamp: "some",
        changeSetRef: null,
        payload: { title: "Foo" },
        debounceCount: 0,
        mutatedRefs: [],
    }).toMatchTypeOf<CreatePostMutationSchema>()

    expectTypeOf("createPost" as const).toEqualTypeOf<
        CreatePostMutationSchema["name"]
    >()
    expectTypeOf("Mutation/asdfasdfasdf" as const).toMatchTypeOf<
        CreatePostMutationSchema["ref"]
    >()
})

test("changeSetRef works", () => {
    const name = "createPost"
    const payloadSchema = z.object({ title: z.string() })
    const createPost = mutationSchemaGenerator(name, payloadSchema)

    createPost.parse({
        ref: "Mutation/12",
        operation: {
            name: "createPost",
        },
        identityRef: "Person/1",
        timestamp: new Date().toISOString(),
        changeSetRef: "Foo/123",
        payload: { title: "Foo" },
        debounceCount: 0,
        log: [],
    })
})
