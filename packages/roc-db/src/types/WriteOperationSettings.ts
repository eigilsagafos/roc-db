import type { ZodSchema } from "zod"

export type WriteOperationSettings = {
    version?: number
    debounce?: number
    changeSetOnly?: boolean
    outputSchema?: ZodSchema
}
