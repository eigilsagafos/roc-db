import { Query, QueryChain, writeOperation } from "roc-db"
import { z } from "zod"
import { BlockRowRefSchema } from "../schemas/BlockRowRefSchema"
import { PostRefSchema } from "../schemas/PostRefSchema"

/**
 * Like `createBlockRow`, but it reads its own changeSet root before creating the
 * block — a common "validate/attach against the changeSet root" pattern. When a
 * mutation of this op is cloned into a freshly-created target and replayed, that
 * read resolves the TARGET root. In the one-transaction duplicate pattern the
 * target root is created (uncommitted) by the same outer operation, so the
 * primitive must surface the outer transaction's pending writes to replay —
 * otherwise this read throws NotFoundError for the target changeSet ref.
 */
export const createBlockRowReadingRoot = writeOperation(
    "createBlockRowReadingRoot",
    z
        .object({ parentRef: z.union([PostRefSchema, BlockRowRefSchema]) })
        .strict(),
    txn => {
        const ref = txn.createRef("BlockRow")
        const { parentRef } = txn.payload
        return QueryChain(
            // Read the changeSet root (the target root, during replay).
            Query(() => {
                if (txn.changeSetRef) txn.readEntity(txn.changeSetRef)
            }),
            Query(() => txn.readEntity(parentRef)),
            Query(parent =>
                txn.patchEntity(parentRef, {
                    children: { blocks: [...parent.children.blocks, ref] },
                }),
            ),
            Query(() =>
                txn.createEntity(ref, {
                    children: { blocks: [] },
                    parents: { parent: parentRef },
                }),
            ),
            Query(block => ({ block })),
        )
    },
    {
        changeSetOnly: true,
        outputSchema: z.object({ block: z.any() }),
    },
)
