import type { ZodSchema } from "zod"
import type { Ref } from "./Ref"

export type ReadOperation<
    OperationName extends string = any,
    Input = any,
    Output = any,
> = {
    (input: Input, changeSetRef?: Ref): Output
    readonly operationName: OperationName
    readonly outputSchema: ZodSchema
}
