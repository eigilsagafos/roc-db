import type { z, ZodSchema } from "zod"
import type { WriteTransaction } from "../lib/WriteTransaction"

export type WriteOperation<
    Name extends string = string,
    PayloadSchema extends ZodSchema = ZodSchema,
> = {
    readonly type: "write"
    readonly name: Name
    readonly payloadSchema: PayloadSchema
    readonly outputSchema?: ZodSchema
    readonly version: number
    readonly debounce: number
    readonly changeSetOnly: boolean
    readonly callback: (
        txn: WriteTransaction<any, z.output<PayloadSchema>>,
        session?: any,
    ) => any
    readonly mutationSchema: ZodSchema
}
