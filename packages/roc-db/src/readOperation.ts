import type { z, ZodSchema } from "zod"
import type { ReadOperation } from "./types/ReadOperation"
import type { ReadTransaction } from "./lib/ReadTransaction"

export const readOperation = <
    const Name extends string,
    const PayloadSchema extends ZodSchema,
>(
    name: Name,
    payloadSchema: PayloadSchema,
    callback: (txn: ReadTransaction<any, z.output<PayloadSchema>>) => any,
): ReadOperation<Name, PayloadSchema> => {
    return {
        type: "read",
        name,
        payloadSchema,
        callback,
    } as ReadOperation<Name, PayloadSchema>
}
