import type { z, ZodSchema } from "zod"
import type { ReadTransaction } from "../lib/ReadTransaction"

export type ReadOperation<
    Name extends string = string,
    PayloadSchema extends ZodSchema = ZodSchema,
> = {
    readonly type: "read"
    readonly name: Name
    readonly payloadSchema: PayloadSchema
    // Optional, mirrors WriteOperation. Only validated on writes today, so it's
    // inert for reads — but adapters/operations may declare it.
    readonly outputSchema?: ZodSchema
    readonly callback: (
        txn: ReadTransaction<any, z.output<PayloadSchema>>,
        session?: any,
    ) => any
}

// (input: Input, changeSetRef?: Ref): Output
