import { createInMemoryAdapter } from "@roc-db/in-memory"
import {
    entities,
    operations,
    PostRefSchema,
    UserRefSchema,
} from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import { Query, QueryChain, writeOperation } from "roc-db"
import { z } from "zod"
import { ReplayDivergenceError } from "../errors/ReplayDivergenceError"
import type { ReplayDivergenceConfig } from "../types/ReplayDivergence"
import { Snowflake } from "../utils/Snowflake"
import { compareReplayLogs } from "./verifyReplayDivergence"

// --- Custom operations used to build divergent / faithful changesets ----------

// Non-deterministic on replay: patches each ref, but reverses the processing
// order on every second invocation. Authoring runs first (order preserved),
// replay runs second (order reversed) -> the log entries land in a different
// order. `buildReorderOp` returns a fresh op (with a fresh call counter) so
// tests don't share state.
const buildReorderOp = () => {
    let calls = 0
    return writeOperation(
        "reorderTitles",
        z.object({ refs: z.array(PostRefSchema) }),
        txn => {
            const refs = [...txn.payload.refs]
            if (calls % 2 === 1) refs.reverse()
            calls++
            return QueryChain(
                ...refs.map(ref =>
                    Query(() =>
                        txn.patchEntity(ref, { data: { title: `t-${ref}` } }),
                    ),
                ),
            )
        },
    )
}

// A non-debounced title setter, so two calls produce two distinct mutations
// (debounceCount 0) rather than a single debounced one.
const setTitle = writeOperation(
    "setTitle",
    z.object({ ref: PostRefSchema, title: z.string() }),
    txn =>
        Query(() =>
            txn.patchEntity(txn.payload.ref, {
                data: { title: txn.payload.title },
            }),
        ),
)

// Exercises data:{} (a no-op patch that changes only metadata).
const touchPost = writeOperation(
    "touchPost",
    z.object({ ref: PostRefSchema }),
    txn => Query(() => txn.patchEntity(txn.payload.ref, { data: {} })),
)

const setPostText = writeOperation(
    "setPostText",
    z.object({ ref: PostRefSchema, text: z.string() }),
    txn =>
        Query(() =>
            txn.patchEntity(txn.payload.ref, {
                data: { text: txn.payload.text },
            }),
        ),
)

// Exercises data:{field:null} (clearing an optional field).
const clearPostText = writeOperation(
    "clearPostText",
    z.object({ ref: PostRefSchema }),
    txn =>
        Query(() => txn.patchEntity(txn.payload.ref, { data: { text: null } })),
)

const setPostAuthor = writeOperation(
    "setPostAuthor",
    z.object({ ref: PostRefSchema, author: UserRefSchema }),
    txn =>
        Query(() =>
            txn.patchEntity(txn.payload.ref, {
                parents: { author: txn.payload.author },
            }),
        ),
)

// Exercises parents.<field> -> null.
const clearPostAuthor = writeOperation(
    "clearPostAuthor",
    z.object({ ref: PostRefSchema }),
    txn =>
        Query(() =>
            txn.patchEntity(txn.payload.ref, { parents: { author: null } }),
        ),
)

const customOps = [
    setTitle,
    touchPost,
    setPostText,
    clearPostText,
    setPostAuthor,
    clearPostAuthor,
]

const mk = (
    snowflake: Snowflake,
    extraOps: any[] = [],
    replayDivergence?: ReplayDivergenceConfig,
): any =>
    createInMemoryAdapter({
        operations: [...operations, ...customOps, ...extraOps] as any,
        entities,
        session: { identityRef: "User/42" },
        snowflake,
        optimistic: true,
        replayDivergence,
    })

// --- Integration tests (real replay through loadMutations) --------------------

describe("verifyReplayDivergence (replay through loadMutations)", () => {
    test("non-deterministic replay throws ReplayDivergenceError under strict", () => {
        const snowflake = new Snowflake(10, 10)
        const reorderOp = buildReorderOp()
        const source = mk(snowflake, [reorderOp])

        const [postA, createA] = source.createPost({ title: "A" })
        const [postB, createB] = source.createPost({ title: "B" })
        const [, reorderMut] = source.reorderTitles({
            refs: [postA.ref, postB.ref],
        })

        // Same op instance -> its call counter is now 1, so replay reverses.
        const target = mk(snowflake, [reorderOp], { policy: "strict" })

        let thrown: unknown
        try {
            target.loadMutations([createA, createB, reorderMut])
        } catch (err) {
            thrown = err
        }
        expect(thrown).toBeInstanceOf(ReplayDivergenceError)
        const info = (thrown as ReplayDivergenceError).info
        expect(info.mutationRef).toBe(reorderMut.ref)
        expect(info.operation).toBe("reorderTitles")
        expect(info.kind).toBe("entry-order")
    })

    test("non-deterministic replay warns and continues under warn", () => {
        const snowflake = new Snowflake(11, 11)
        const reorderOp = buildReorderOp()
        const source = mk(snowflake, [reorderOp])

        const [postA, createA] = source.createPost({ title: "A" })
        const [postB, createB] = source.createPost({ title: "B" })
        const [, reorderMut] = source.reorderTitles({
            refs: [postA.ref, postB.ref],
        })

        const seen: string[] = []
        const target = mk(snowflake, [reorderOp], {
            policy: "warn",
            onDivergence: info => seen.push(info.kind),
        })

        const warnings: string[] = []
        const originalWarn = console.warn
        console.warn = (...args: unknown[]) => {
            warnings.push(args.join(" "))
        }
        try {
            expect(() =>
                target.loadMutations([createA, createB, reorderMut]),
            ).not.toThrow()
        } finally {
            console.warn = originalWarn
        }

        expect(seen).toContain("entry-order")
        expect(warnings.some(w => w.includes("Replay divergence"))).toBe(true)
    })

    test("faithful changeset replays with zero false positives under strict", () => {
        const snowflake = new Snowflake(12, 12)
        const source = mk(snowflake)

        const [user, createUser] = source.createUser({ email: "a@b.com" })
        const [post, createPost] = source.createPost({ title: "Hello" })
        const [, titleMut] = source.updatePostTitle({
            ref: post.ref,
            title: "Hello 2",
        })
        const [, tagsMut] = source.updatePostTags({
            ref: post.ref,
            tags: ["x", "y"],
        })
        const [, touchMut] = source.touchPost({ ref: post.ref }) // data:{}
        const [, setTextMut] = source.setPostText({
            ref: post.ref,
            text: "hi",
        })
        const [, clearTextMut] = source.clearPostText({ ref: post.ref }) // data:{text:null}
        const [, setAuthorMut] = source.setPostAuthor({
            ref: post.ref,
            author: user.ref,
        })
        const [, clearAuthorMut] = source.clearPostAuthor({ ref: post.ref }) // parents:{author:null}

        const target = mk(snowflake, [], { policy: "strict" })

        expect(() =>
            target.loadMutations([
                createUser,
                createPost,
                titleMut,
                tagsMut,
                touchMut,
                setTextMut,
                clearTextMut,
                setAuthorMut,
                clearAuthorMut,
            ]),
        ).not.toThrow()

        const read = target.readPost(post.ref)
        expect(read.data.title).toBe("Hello 2")
        expect(read.data.tags).toEqual(["x", "y"])
        expect(read.data.text).toBeUndefined()
        expect(read.parents.author).toBeUndefined()
    })

    test("persistedAt order != causal order surfaces as a divergence", () => {
        const snowflake = new Snowflake(13, 13)
        const source = mk(snowflake)

        const [post, createMut] = source.createPost({ title: "T" })
        const [, m1] = source.setTitle({ ref: post.ref, title: "A" })
        const [, m2] = source.setTitle({ ref: post.ref, title: "B" })

        // All persistedAt present -> sortMutations sorts by persistedAt. Assign
        // them so the persisted order (create, m2, m1) reverses the causal order
        // (create, m1, m2): m2 would replay before m1, on a pre-state that never
        // saw m1.
        createMut.persistedAt = "2020-01-01T00:00:00.000000Z"
        m1.persistedAt = "2020-01-01T00:00:03.000000Z"
        m2.persistedAt = "2020-01-01T00:00:02.000000Z"

        const target = mk(snowflake, [], { policy: "strict" })

        let thrown: unknown
        try {
            target.loadMutations([createMut, m1, m2])
        } catch (err) {
            thrown = err
        }
        expect(thrown).toBeInstanceOf(ReplayDivergenceError)
        // m2 replays first and diverges on the title's pre-value.
        expect((thrown as ReplayDivergenceError).info.mutationRef).toBe(m2.ref)
        expect((thrown as ReplayDivergenceError).info.kind).toBe("update-field")
    })

    test("fresh-write path is unaffected by strict policy", () => {
        const snowflake = new Snowflake(14, 14)
        const adapter = mk(snowflake, [], { policy: "strict" })

        expect(() => adapter.createPost({ title: "X" })).not.toThrow()
        const [post] = adapter.createPost({ title: "Y" })
        expect(() =>
            adapter.updatePostTitle({ ref: post.ref, title: "Z" }),
        ).not.toThrow()
    })
})

// --- Unit tests for the comparator itself -------------------------------------

describe("compareReplayLogs", () => {
    test("data:{} is equal to data:{field:null}", () => {
        expect(
            compareReplayLogs(
                [["Post/1", "update", { data: {} }]],
                [["Post/1", "update", { data: { narrative: null } }]],
            ),
        ).toBeNull()
    })

    test("parents.<field>:null is equal to absent", () => {
        expect(
            compareReplayLogs(
                [["Post/1", "update", { parents: { end: null } }]],
                [["Post/1", "update", { parents: {} }]],
            ),
        ).toBeNull()
    })

    test("ignores created/updated metadata", () => {
        expect(
            compareReplayLogs(
                [
                    [
                        "Post/1",
                        "update",
                        {
                            updated: { mutationRef: "M/1", timestamp: "t1" },
                            data: { title: "a" },
                        },
                    ],
                ],
                [
                    [
                        "Post/1",
                        "update",
                        {
                            updated: { mutationRef: "M/2", timestamp: "t2" },
                            data: { title: "a" },
                        },
                    ],
                ],
            ),
        ).toBeNull()
    })

    test("a metadata-only reverse-patch equals a missing third element", () => {
        // An update that changed only metadata canonicalizes to empty; it must
        // compare equal to an entry with no third element at all (both "empty").
        expect(
            compareReplayLogs(
                [["Post/1", "update"]],
                [
                    [
                        "Post/1",
                        "update",
                        { updated: { mutationRef: "M/2", timestamp: "t2" } },
                    ],
                ],
            ),
        ).toBeNull()
    })

    test("detects a diverged update value (array order)", () => {
        const diff = compareReplayLogs(
            [["Post/1", "update", { children: { items: ["a", "b"] } }]],
            [["Post/1", "update", { children: { items: ["b", "a"] } }]],
        )
        expect(diff?.kind).toBe("update-field")
        expect(diff?.field).toBe("children.items[0]")
    })

    test("detects a changed action", () => {
        const diff = compareReplayLogs(
            [["Post/1", "update", { data: { title: "a" } }]],
            [["Post/1", "delete", { data: { title: "a" } }]],
        )
        expect(diff?.kind).toBe("action")
    })

    test("detects entry-order divergence (same set, different order)", () => {
        const diff = compareReplayLogs(
            [
                ["Post/1", "update", { data: { x: 1 } }],
                ["Post/2", "update", { data: { x: 1 } }],
            ],
            [
                ["Post/2", "update", { data: { x: 1 } }],
                ["Post/1", "update", { data: { x: 1 } }],
            ],
        )
        expect(diff?.kind).toBe("entry-order")
    })

    test("detects entry-count divergence (extra recomputed entry)", () => {
        const diff = compareReplayLogs(
            [["Post/1", "create"]],
            [
                ["Post/1", "create"],
                ["Post/2", "create"],
            ],
        )
        expect(diff?.kind).toBe("entry-count")
        expect(diff?.entity).toBe("Post/2")
    })

    test("detects a diverged update pre-value (causal reorder propagation)", () => {
        // Two faithful updates replayed in the wrong order leave a later update
        // reversing a different pre-value than stored.
        const diff = compareReplayLogs(
            [["Post/1", "update", { data: { title: "A" } }]],
            [["Post/1", "update", { data: { title: "T" } }]],
        )
        expect(diff?.kind).toBe("update-field")
        expect(diff?.field).toBe("data.title")
    })
})
