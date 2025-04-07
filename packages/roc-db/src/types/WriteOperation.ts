import type { ZodSchema } from "zod"
import type { WriteOperationSettings } from "./WriteOperationSettings"
import type { Ref } from "./Ref"
import type { WriteRequest } from "./WriteRequest"

export type WriteOperation<
    OperationName extends string = any,
    Mutation = any,
    Payload = any,
    Output = any,
> = {
    (payload: Payload, changeSetRef?: Ref): WriteRequest<Payload>
    readonly operationName: OperationName
    readonly outputSchema: ZodSchema
    readonly settings: WriteOperationSettings
}
