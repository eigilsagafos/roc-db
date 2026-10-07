const USER_A = "User/42"
const USER_B = "User/99"

/**
 * A mixed mutation log for the `pageMutations` / `mutationFacets` conformance
 * tests: root mutations, change-set mutations that are still pending, and
 * change-set mutations whose change set has been applied — all in one store,
 * written by two different identities.
 *
 * Both adapters share one engine, so the two identities write to the same log.
 * Returns the mutation refs in creation order (oldest first), which is the
 * reverse of what `pageMutations` returns.
 */
export const prepareMutationQueryFixture = async (
    createAdapter: (opts: any) => Promise<any>,
    engineArgs: any,
) => {
    const userA = await createAdapter({
        engineArgs,
        session: { identityRef: USER_A },
    })
    const userB = await createAdapter({
        engineArgs,
        session: { identityRef: USER_B },
    })

    // 1 root / userA
    const [postA, createPostA] = await userA.createPost({
        title: "Post A",
        slug: "mutation-query-post-a",
    })
    // 2 root / userA
    const [postB, createPostB] = await userA.createPost({
        title: "Post B",
        slug: "mutation-query-post-b",
    })
    // 3 root / userB
    const [draftA, createDraftA] = await userB.createDraft({
        postRef: postA.ref,
    })
    // 4 changeSet draftA / userB
    const [{ block: paragraph }, createParagraph] = await userB
        .changeSet(draftA.ref)
        .createBlockParagraph({ parentRef: postA.ref })
    // 5 changeSet draftA / userA
    const [{ block: row }, createRow] = await userA
        .changeSet(draftA.ref)
        .createBlockRow({ parentRef: postA.ref })
    // 6 root / userA
    const [draftB, createDraftB] = await userA.createDraft({
        postRef: postB.ref,
    })
    // 7 changeSet draftB / userB — never applied, so it stays pending
    const [{ block: pendingParagraph }, createPendingParagraph] = await userB
        .changeSet(draftB.ref)
        .createBlockParagraph({ parentRef: postB.ref })
    // 8 root / userA. Applying draftA produces a root mutation of its own; the
    // draft's mutations (4 and 5) keep their changeSetRef.
    const [, applyDraftA] = await userA.applyDraft(draftA.ref)

    return {
        adapter: userA,
        userA: USER_A,
        userB: USER_B,
        postA,
        postB,
        draftARef: draftA.ref,
        draftBRef: draftB.ref,
        paragraphRef: paragraph.ref,
        rowRef: row.ref,
        pendingParagraphRef: pendingParagraph.ref,
        // Oldest first.
        mutations: [
            createPostA,
            createPostB,
            createDraftA,
            createParagraph,
            createRow,
            createDraftB,
            createPendingParagraph,
            applyDraftA,
        ],
    }
}
