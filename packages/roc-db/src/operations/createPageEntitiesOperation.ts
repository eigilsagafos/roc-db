import { z } from "zod"
import { readOperation } from "../readOperation"
import { Query } from "../utils/Query"

export const createPageEntitiesOperation = entities =>
    readOperation(
        "pageEntities",
        z
            .object({
                size: z.number().default(30),
                skip: z.number().default(0),
                include: z
                    .union([z.array(z.enum(["foo", "bar"])), z.literal("*")])
                    .default("*"),
                exclude: z.array(z.enum(["foo", "bar"])).default([]),
            })
            .strict(),
        z.object({}),
        txn => {
            // console.log("txn.pageMutations()", txn.)
            // throw new Error("Not implemented")
            const { size, skip, include, exclude } = txn.payload
            return Query(() =>
                txn.pageEntities({ size, skip, include, exclude }),
            )
        },
    )
