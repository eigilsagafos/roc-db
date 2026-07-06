import type { ZodSchema } from "zod"

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
    readonly callback: (txn: any, session?: any) => any
}

// (input: Input, changeSetRef?: Ref): Output
