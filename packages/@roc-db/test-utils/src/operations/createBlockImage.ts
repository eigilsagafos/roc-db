import { Query, writeOperation } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "../schemas/PostRefSchema"

export const createBlockImage = writeOperation(
    "createBlockImage",
    z.object({ parentRef: PostRefSchema, url: z.string().url() }).strict(),
    txn => {
        const ref = txn.createRef("BlockImage")
        const { parentRef, url } = txn.payload
        return Query(() =>
            txn.createEntity(ref, {
                data: { url },
                parents: { parent: parentRef },
            }),
        )
    },
    { changeSetOnly: true },
)
