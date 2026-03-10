import type { ZodType } from "zod"

export type WriteOperationSettings = {
    version?: number
    debounce?: number
    changeSetOnly?: boolean
    outputSchema?: ZodType
    mutationLogSchema?: ZodType
}
