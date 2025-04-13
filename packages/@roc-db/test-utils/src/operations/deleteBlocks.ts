import { Query, QueryChain, writeOperation } from "roc-db"
import { z } from "zod"
import { PostSchema } from "../schemas"
import { BlockImageRefSchema } from "../schemas/BlockImageRefSchema"
import { BlockParagraphRefSchema } from "../schemas/BlockParagraphRefSchema"
import { BlockRowRefSchema } from "../schemas/BlockRowRefSchema"

const DeleteBlockQuery = (txn, blockRef) => {
    return QueryChain(
        Query(() => txn.readEntity(blockRef)),
        Query(block => {
            return txn.readEntity(block.parents.parent, true)
        }),
        Query(post => {
            return txn.patchEntity(post.ref, {
                children: {
                    blocks: post.children.blocks.filter(
                        ref => ref !== blockRef,
                    ),
                },
            })
        }),
        Query(() => txn.deleteEntity(blockRef)),
    )
}

export const deleteBlocks = writeOperation(
    "deleteBlocks",
    z.array(
        z.union([
            BlockParagraphRefSchema,
            BlockImageRefSchema,
            BlockRowRefSchema,
        ]),
    ),
    txn => {
        const refs = txn.payload
        return QueryChain(...refs.map(ref => DeleteBlockQuery(txn, ref)))
    },
    { changeSetOnly: true },
)
