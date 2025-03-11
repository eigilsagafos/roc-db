import { z } from "zod"
import { readOperation } from "../readOperation"
import { Query } from "../utils/Query"

export const pageMutations = readOperation(
    "pageMutations",
    z
        .object({
            size: z.number().default(30),
            skip: z.number().default(0),
            changeSetRef: z.string().optional(),
        })
        .optional(),
    z.object({}),
    txn => {
        // console.log("txn.pageMutations()", txn.)
        // throw new Error("Not implemented")
        return Query(() => txn.pageMutations(txn.payload))
    },
)
