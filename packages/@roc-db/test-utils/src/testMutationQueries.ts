import { beforeAll, describe, expect, test } from "bun:test"
import { prepareMutationQueryFixture } from "./prepareMutationQueryFixture"

/**
 * Conformance tests for `pageMutations` and `mutationFacets`.
 *
 * Every assertion here pins an exact, ordered list of mutation refs rather than
 * a length or a membership check. Because the whole suite runs unchanged
 * against postgres, valdres, in-memory and indexed-db, pinning exact values is
 * a stronger cross-adapter parity guarantee than comparing two adapters to each
 * other would be: it also fixes what the shared answer has to be.
 */
export const testMutationQueries = (
    createAdapter: (opts: any) => Promise<any>,
    generateArgs: () => any,
) => {
    describe("pageMutations", () => {
        let fixture: Awaited<ReturnType<typeof prepareMutationQueryFixture>>
        let adapter: any
        // Mutation refs in creation order (oldest first). `at(n)` is 1-indexed
        // to match the numbering in the fixture, so `at(8)` is the applyDraft.
        let at: (...positions: number[]) => string[]

        beforeAll(async () => {
            fixture = await prepareMutationQueryFixture(
                createAdapter,
                await generateArgs(),
            )
            adapter = fixture.adapter
            at = (...positions) =>
                positions.map(
                    position => fixture.mutations[position - 1]!.ref as string,
                )
        })

        const refs = (mutations: any[]) => mutations.map(m => m.ref)

        describe("backwards compatibility", () => {
            test("no predicates returns the whole log, newest first", async () => {
                const res = await adapter.pageMutations({})
                expect(refs(res)).toStrictEqual(at(8, 7, 6, 5, 4, 3, 2, 1))
            })

            test("changeSetRef still filters by equality", async () => {
                const res = await adapter.pageMutations({
                    changeSetRef: fixture.draftARef,
                })
                expect(refs(res)).toStrictEqual(at(5, 4))
            })

            test("changeSetRef and changeSet agree", async () => {
                const legacy = await adapter.pageMutations({
                    changeSetRef: fixture.draftARef,
                })
                const current = await adapter.pageMutations({
                    changeSet: fixture.draftARef,
                })
                expect(current).toStrictEqual(legacy)
            })

            test("changeSetRef: null still means no filter", async () => {
                // The historic meaning. Callers threading a nullable ref must
                // not silently switch to "root only" — that's why `none` is a
                // separate word.
                const res = await adapter.pageMutations({ changeSetRef: null })
                expect(refs(res)).toStrictEqual(at(8, 7, 6, 5, 4, 3, 2, 1))
            })
        })

        describe("changeSet", () => {
            test('"any" is the default', async () => {
                const res = await adapter.pageMutations({ changeSet: "any" })
                const defaulted = await adapter.pageMutations({})
                expect(res).toStrictEqual(defaulted)
            })

            test('"none" returns exactly the root mutations', async () => {
                // 8 is the applyDraft: applying a change set writes a root
                // mutation of its own, while the draft's own mutations (4, 5)
                // keep their changeSetRef and stay out of this result.
                const res = await adapter.pageMutations({
                    changeSet: "none",
                    size: null,
                })
                expect(refs(res)).toStrictEqual(at(8, 6, 3, 2, 1))
            })

            test("an applied change set still owns its mutations", async () => {
                const res = await adapter.pageMutations({
                    changeSet: fixture.draftARef,
                })
                expect(refs(res)).toStrictEqual(at(5, 4))
            })

            test("a pending change set", async () => {
                const res = await adapter.pageMutations({
                    changeSet: fixture.draftBRef,
                })
                expect(refs(res)).toStrictEqual(at(7))
            })

            test("an unknown change set is empty, not everything", async () => {
                const res = await adapter.pageMutations({
                    changeSet: "Draft/1",
                })
                expect(refs(res)).toStrictEqual([])
            })

            test("null is rejected rather than reinterpreted", async () => {
                await expect(() =>
                    adapter.pageMutations({ changeSet: null }),
                ).toThrow()
            })

            test("changeSet and changeSetRef together is an error", async () => {
                await expect(() =>
                    adapter.pageMutations({
                        changeSet: "none",
                        changeSetRef: fixture.draftARef,
                    }),
                ).toThrow()
            })
        })

        describe("operationName", () => {
            test("single", async () => {
                const res = await adapter.pageMutations({
                    operationName: "createPost",
                })
                expect(refs(res)).toStrictEqual(at(2, 1))
            })

            test("several", async () => {
                const res = await adapter.pageMutations({
                    operationName: ["createDraft", "applyDraft"],
                })
                expect(refs(res)).toStrictEqual(at(8, 6, 3))
            })

            test("no match", async () => {
                const res = await adapter.pageMutations({
                    operationName: "deletePost",
                })
                expect(refs(res)).toStrictEqual([])
            })
        })

        describe("identityRef", () => {
            test("single", async () => {
                const res = await adapter.pageMutations({
                    identityRef: fixture.userB,
                })
                expect(refs(res)).toStrictEqual(at(7, 4, 3))
            })

            test("several", async () => {
                const res = await adapter.pageMutations({
                    identityRef: [fixture.userA, fixture.userB],
                })
                expect(refs(res)).toStrictEqual(at(8, 7, 6, 5, 4, 3, 2, 1))
            })
        })

        describe("logRefs", () => {
            test("single ref: everything that touched an entity", async () => {
                // 1 created postA; 4 and 5 added blocks to it; 8 replayed
                // those into root when the draft was applied.
                const res = await adapter.pageMutations({
                    logRefs: fixture.postA.ref,
                })
                expect(refs(res)).toStrictEqual(at(8, 5, 4, 1))
            })

            test("a ref only one mutation touched", async () => {
                const res = await adapter.pageMutations({
                    logRefs: fixture.pendingParagraphRef,
                })
                expect(refs(res)).toStrictEqual(at(7))
            })

            test("several refs means ALL of them (containment)", async () => {
                const res = await adapter.pageMutations({
                    logRefs: [fixture.postA.ref, fixture.paragraphRef],
                })
                expect(refs(res)).toStrictEqual(at(8, 4))
            })

            test("containment, not overlap", async () => {
                // rowRef and pendingParagraphRef never appear in the same log,
                // so an overlap (`&&`) implementation would wrongly return 5,
                // 7 and 8 here.
                const res = await adapter.pageMutations({
                    logRefs: [fixture.rowRef, fixture.pendingParagraphRef],
                })
                expect(refs(res)).toStrictEqual([])
            })
        })

        describe("combined predicates", () => {
            test("changeSet + logRefs", async () => {
                const res = await adapter.pageMutations({
                    changeSet: "none",
                    logRefs: fixture.postA.ref,
                })
                expect(refs(res)).toStrictEqual(at(8, 1))
            })

            test("changeSet + identityRef", async () => {
                const res = await adapter.pageMutations({
                    changeSet: fixture.draftARef,
                    identityRef: fixture.userA,
                })
                expect(refs(res)).toStrictEqual(at(5))
            })

            test("changeSet + operationName", async () => {
                const res = await adapter.pageMutations({
                    changeSet: "none",
                    operationName: "createPost",
                })
                expect(refs(res)).toStrictEqual(at(2, 1))
            })

            test("everything at once", async () => {
                const res = await adapter.pageMutations({
                    changeSet: "none",
                    operationName: ["createPost", "applyDraft"],
                    identityRef: fixture.userA,
                    logRefs: fixture.postA.ref,
                    size: 1,
                })
                expect(refs(res)).toStrictEqual(at(8))
            })
        })

        describe("paging", () => {
            // Walk every page with the keyset cursor: the last row of a page
            // becomes the next page's `before`/`beforeRef`.
            const pageThrough = async (args: any, size: number) => {
                const pages: string[][] = []
                let cursor: any = null
                for (;;) {
                    const page = await adapter.pageMutations({
                        ...args,
                        size,
                        ...(cursor
                            ? {
                                  before: cursor.timestamp,
                                  beforeRef: cursor.ref,
                              }
                            : {}),
                    })
                    pages.push(refs(page))
                    if (page.length === 0) break
                    if (pages.length > 20)
                        throw new Error("paging did not terminate")
                    cursor = page[page.length - 1]
                }
                return pages
            }

            test("size caps the page", async () => {
                const res = await adapter.pageMutations({ size: 3 })
                expect(refs(res)).toStrictEqual(at(8, 7, 6))
            })

            test("size: null is unbounded", async () => {
                const res = await adapter.pageMutations({ size: null })
                expect(refs(res)).toStrictEqual(at(8, 7, 6, 5, 4, 3, 2, 1))
            })

            test("last partial page", async () => {
                expect(await pageThrough({}, 3)).toStrictEqual([
                    at(8, 7, 6),
                    at(5, 4, 3),
                    at(2, 1),
                    [],
                ])
            })

            test("exact multiple of the page size", async () => {
                expect(await pageThrough({}, 4)).toStrictEqual([
                    at(8, 7, 6, 5),
                    at(4, 3, 2, 1),
                    [],
                ])
            })

            test("paging a filtered set", async () => {
                expect(
                    await pageThrough({ changeSet: "none" }, 2),
                ).toStrictEqual([at(8, 6), at(3, 2), at(1), []])
            })

            test("empty result", async () => {
                expect(
                    await pageThrough({ operationName: "deletePost" }, 3),
                ).toStrictEqual([[]])
            })

            test("before without beforeRef excludes the whole timestamp", async () => {
                const [newest] = await adapter.pageMutations({ size: 1 })
                const res = await adapter.pageMutations({
                    size: null,
                    before: newest.timestamp,
                })
                expect(
                    res.map((m: any) => m.timestamp < newest.timestamp),
                ).not.toContain(false)
            })

            test("beforeRef without before is an error", async () => {
                await expect(() =>
                    adapter.pageMutations({
                        beforeRef: fixture.mutations[7]!.ref,
                    }),
                ).toThrow()
            })

            test("size must be positive", async () => {
                await expect(() => adapter.pageMutations({ size: 0 })).toThrow()
            })

            test("the retired `skip` argument is rejected, not ignored", async () => {
                await expect(() => adapter.pageMutations({ skip: 2 })).toThrow()
            })
        })

        describe("mutationFacets", () => {
            test("all fields, no predicates", async () => {
                const res = await adapter.mutationFacets({})
                expect(res).toStrictEqual({
                    operationName: [
                        { value: "createBlockParagraph", count: 2 },
                        { value: "createDraft", count: 2 },
                        { value: "createPost", count: 2 },
                        { value: "applyDraft", count: 1 },
                        { value: "createBlockRow", count: 1 },
                    ],
                    identityRef: [
                        { value: fixture.userA, count: 5 },
                        { value: fixture.userB, count: 3 },
                    ],
                })
            })

            test("honours the changeSet tri-state", async () => {
                const res = await adapter.mutationFacets({
                    changeSet: "none",
                    fields: ["identityRef"],
                })
                expect(res).toStrictEqual({
                    identityRef: [
                        { value: fixture.userA, count: 4 },
                        { value: fixture.userB, count: 1 },
                    ],
                })
            })

            test("honours the other predicates", async () => {
                const res = await adapter.mutationFacets({
                    changeSet: fixture.draftARef,
                    fields: ["operationName"],
                })
                expect(res).toStrictEqual({
                    operationName: [
                        { value: "createBlockParagraph", count: 1 },
                        { value: "createBlockRow", count: 1 },
                    ],
                })
            })

            test("an empty set produces empty buckets", async () => {
                const res = await adapter.mutationFacets({
                    changeSet: "Draft/1",
                })
                expect(res).toStrictEqual({
                    operationName: [],
                    identityRef: [],
                })
            })

            test("unknown field is rejected", async () => {
                await expect(() =>
                    adapter.mutationFacets({ fields: ["payload"] }),
                ).toThrow()
            })

            test("paging arguments are rejected", async () => {
                await expect(() =>
                    adapter.mutationFacets({ size: 5 }),
                ).toThrow()
            })
        })
    })
}
