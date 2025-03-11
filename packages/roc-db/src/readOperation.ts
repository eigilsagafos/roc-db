import type { z, ZodSchema, ZodType } from "zod"
import type { ReadOperation } from "./types/ReadOperation"
import type { ReadTransaction } from "./lib/ReadTransaction"
import type { ReadRequest } from "./types/ReadRequest"
import { Ref } from "./types/Ref"

export const readOperation = <
    const OperationName extends string,
    InputSchema extends ZodSchema,
    OutputSchema extends ZodSchema,
>(
    operationName: OperationName,
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    queryFn: (
        txn: ReadTransaction<ReadRequest<z.infer<InputSchema>>, any, any, any>,
    ) => ZodType<OutputSchema>,
): ReadOperation<
    OperationName,
    ZodType<InputSchema>,
    ZodType<OutputSchema>
> => {
    return Object.assign(
        (payload: ZodType<InputSchema>, changeSetRef?: Ref) => {
            return {
                type: "read",
                schema: inputSchema,
                payload,
                callback: queryFn,
                changeSetRef,
            } as const
        },
        {
            operationName: operationName,
            outputSchema: outputSchema,
        },
    )
}
