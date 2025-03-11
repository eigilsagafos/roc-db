import { Query, QueryChain, writeOperation } from "roc-db"
import { DeleteBlockMutationSchema } from "../schemas/DeleteBlockMutationSchema"
import { PostSchema } from "../schemas"

export const deleteBlock = writeOperation(
    DeleteBlockMutationSchema,
    PostSchema,
    txn => {
        const blockRef = txn.payload
        return QueryChain(
            Query(() => txn.readEntity(blockRef, true)),
            Query(block => txn.readEntity(block.parents.post, true)),
            Query(post => {
                return txn.patchEntity(post.ref, {
                    data: {
                        blockRefs: post.data.blockRefs.filter(
                            ref => ref !== blockRef,
                        ),
                    },
                })
            }),
            Query(() => txn.deleteEntity(blockRef)),
            Query((_, updatedPost) => {
                return updatedPost
            }),
        )
    },
    { changeSetOnly: true },
)
