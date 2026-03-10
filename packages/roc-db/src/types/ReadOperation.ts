import type { ZodType } from "zod"

export type ReadOperation<
    Name extends string = string,
    PayloadSchema extends ZodType = ZodType,
    OutputSchema extends ZodType = ZodType,
> = {
    readonly type: "read"
    readonly name: Name
    readonly payloadSchema: PayloadSchema
    readonly ouputSchema: OutputSchema
    readonly callback: (s: string) => {}
}

// (input: Input, changeSetRef?: Ref): Output
