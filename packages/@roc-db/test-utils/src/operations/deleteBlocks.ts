import { Query, QueryChain, writeOperation } from "roc-db"
import { DeleteBlocksMutationSchema } from "../schemas/DeleteBlocksMutationSchema"
import { PostSchema } from "../schemas"

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
    DeleteBlocksMutationSchema,
    PostSchema,
    txn => {
        const refs = txn.payload
        return QueryChain(...refs.map(ref => DeleteBlockQuery(txn, ref)))
    },
    { changeSetOnly: true },
)
