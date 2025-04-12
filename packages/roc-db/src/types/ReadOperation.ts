import type { ZodSchema } from "zod"

export type ReadOperation<
    Name extends string = string,
    PayloadSchema extends ZodSchema = ZodSchema,
    OutputSchema extends ZodSchema = ZodSchema,
> = {
    readonly type: "read"
    readonly name: Name
    readonly payloadSchema: PayloadSchema
    readonly ouputSchema: OutputSchema
    readonly callback: (s: string) => {}
}

// (input: Input, changeSetRef?: Ref): Output
