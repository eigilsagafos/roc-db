import type { ZodSchema } from "zod"
import type { WriteOperationSettings } from "./WriteOperationSettings"
import type { Ref } from "./Ref"

export type WriteOperation<
    OperationName extends string = any,
    Mutation = any,
    Payload = any,
    Output = any,
> = {
    (payload: Payload, changeSetRef?: Ref): [Output, Mutation]
    readonly operationName: OperationName
    readonly outputSchema: ZodSchema
    readonly settings: WriteOperationSettings
}
