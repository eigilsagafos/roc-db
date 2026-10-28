import { entities, operations } from "@roc-db/test-utils"
import { describe, expect, test } from "bun:test"
import * as inMemoryFunctions from "../../@roc-db/in-memory/src/functions"
import * as indexedDBFunctions from "../../@roc-db/indexed-db/src/functions"
import * as postgresFunctions from "../../@roc-db/postgres/src/functions"
import * as valdresFunctions from "../../@roc-db/valdres/src/functions"
import { createAdapter } from "./createAdapter"
import { Snowflake } from "./utils/Snowflake"

const adapters = [
    { name: "in-memory", functions: inMemoryFunctions, async: false },
    { name: "indexed-db", functions: indexedDBFunctions, async: true },
    { name: "postgres", functions: postgresFunctions, async: true },
    { name: "valdres", functions: valdresFunctions, async: false },
] as const

// An adapter package released for an older roc-db still installs next to a
// newer one, so the mismatch must surface when the adapter is created, not on
// the first write that needs the missing function.
describe.each(adapters)(
    "$name adapter built for another roc-db",
    ({ name, functions, async }) => {
        const create = (adapterFunctions: any) => () =>
            createAdapter(
                {
                    name,
                    functions: adapterFunctions,
                    operations,
                    entities,
                    snowflake: new Snowflake(1, 1),
                    session: { identityRef: "User/1" },
                    async,
                    optimistic: true,
                },
                {} as any,
            )

        test("fails when it is created if it lacks findRecentMutations", () => {
            const { findRecentMutations, ...older } = functions as any
            expect(
                create({ ...older, findDebounceMutation: () => undefined }),
            ).toThrow(/findRecentMutations/)
        })

        test("is created when it has every function", () => {
            expect(create(functions)).not.toThrow()
        })
    },
)

// Adapters released with roc-db 0.2.0-pre.105 implement findRecentMutations
// but ignore the query's scopeMutations / identityMutations hints, so they
// return more mutations than asked for. Core must pick the same targets.
describe("in-memory adapter from roc-db 0.2.0-pre.105", () => {
    const { findRecentMutations } = inMemoryFunctions
    const createLegacyAdapter = (identityRef: string, engine: any) =>
        createAdapter(
            {
                name: "in-memory",
                functions: {
                    ...inMemoryFunctions,
                    findRecentMutations: (
                        engineOpts: any,
                        { changeSetRef, identityRef, since }: any,
                    ) =>
                        findRecentMutations(engineOpts, {
                            changeSetRef,
                            identityRef,
                            since,
                        }),
                },
                operations,
                entities,
                snowflake: new Snowflake(1, 1),
                session: { identityRef },
                optimistic: false,
            },
            engine,
        ) as any
    const createEngine = () => ({
        entities: new Map(),
        mutations: new Map(),
        entitiesUnique: new Map(),
        entitiesIndex: new Map(),
    })
    const tick = () => Bun.sleep(2)

    test("another identity's root write ends coalescing", async () => {
        const engine = createEngine()
        const adapter = createLegacyAdapter("User/A", engine)
        const system = createLegacyAdapter("System", engine)
        const [post] = adapter.createPost({ title: "Tag", tags: [] })
        await tick()
        const [, version1] = adapter.updatePostTitle({
            ref: post.ref,
            title: "Dra",
        })
        await tick()
        system.createPost({ title: "Session", tags: [] })
        await tick()
        const [, version2] = adapter.updatePostTitle({
            ref: post.ref,
            title: "Drafted",
        })
        expect(version2.ref).not.toBe(version1.ref)
    })

    test("consecutive root writes coalesce", async () => {
        const adapter = createLegacyAdapter("User/A", createEngine())
        const [post] = adapter.createPost({ title: "Tag", tags: [] })
        await tick()
        const [, version1] = adapter.updatePostTitle({
            ref: post.ref,
            title: "Dra",
        })
        await tick()
        const [, version2] = adapter.updatePostTitle({
            ref: post.ref,
            title: "Drafted",
        })
        expect(version2.ref).toBe(version1.ref)
    })

    test("a write in the changeSet ends coalescing", async () => {
        const engine = createEngine()
        const adapter = createLegacyAdapter("User/A", engine)
        const [post] = adapter.createPost({ title: "Post", tags: [] })
        const [draft] = adapter.createDraft({ postRef: post.ref })
        const changeSet = adapter.changeSet(draft.ref)
        const [{ block: holder }] = changeSet.createBlockParagraph({
            parentRef: post.ref,
        })
        await tick()
        const [, version1] = changeSet.updateBlockParagraphMentions({
            ref: holder.ref,
            mentions: [],
        })
        await tick()
        changeSet.createBlockParagraph({ parentRef: post.ref })
        await tick()
        const [, version2] = changeSet.updateBlockParagraphMentions({
            ref: holder.ref,
            mentions: [],
        })
        expect(version2.ref).not.toBe(version1.ref)
    })
})
