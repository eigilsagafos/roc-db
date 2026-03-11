import type { ZodType } from "zod"
import type { Mutation } from "./Mutation"
import type { Ref } from "./Ref"
import type { WriteOperation } from "./WriteOperation"

export type WriteRequest<PayloadSchema extends ZodType = ZodType> = {
    type: "write"
    operation: WriteOperation
    payload: any
    changeSetRef: Ref | null
    optimisticMutation?: Mutation
    isApplyChangeSet?: boolean
}
