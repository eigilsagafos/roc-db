import type { z, ZodType } from "zod"

export type WriteOperation<
    Name extends string = string,
    PayloadSchema extends ZodType = ZodType,
> = {
    readonly type: "write"
    readonly name: Name
    readonly payloadSchema: PayloadSchema
    readonly outputSchema?: ZodType
    readonly version: number
    readonly debounce: number
    readonly changeSetOnly: boolean
    readonly callback: (payload: z.output<PayloadSchema>) => any
    readonly mutationSchema: ZodType
}
