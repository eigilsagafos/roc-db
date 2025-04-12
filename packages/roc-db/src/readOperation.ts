import type { z, ZodSchema, ZodType } from "zod"
import type { ReadOperation } from "./types/ReadOperation"
import type { ReadTransaction } from "./lib/ReadTransaction"
import type { ReadRequest } from "./types/ReadRequest"
import type { Ref } from "./types/Ref"

export const readOperation = <
    const Name extends string,
    const PayloadSchema extends ZodSchema,
>(
    name: Name,
    payloadSchema: PayloadSchema,
    callback: (
        txn: ReadTransaction<ReadRequest<z.infer<InputSchema>>, any, any, any>,
    ) => ZodType<OutputSchema>,
): ReadOperation<Name, ZodType<InputSchema>, ZodType<OutputSchema>> => {
    return {
        type: "read",
        name,
        payloadSchema,
        callback,
    }
    // return Object.assign(
    //     (payload: ZodType<InputSchema>, changeSetRef?: Ref) => {
    //         return {
    //             type: "read",
    //             schema: inputSchema,
    //             payload,
    //             callback: queryFn,
    //             changeSetRef,
    //             operationName,
    //         } as const
    //     },
    //     {
    //         operationName: operationName,
    //         outputSchema: outputSchema,
    //     },
    // )
}
