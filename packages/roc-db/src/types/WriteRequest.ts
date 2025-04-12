import type { ZodSchema } from "zod"
import type { Mutation } from "./Mutation"
import type { Ref } from "./Ref"
import type { WriteOperation } from "./WriteOperation"

export type WriteRequest<PayloadSchema extends ZodSchema = ZodSchema> = {
    type: "write"
    operation: WriteOperation
    payload: any
    changeSetRef: Ref | null
    optimisticMutation?: Mutation
}
