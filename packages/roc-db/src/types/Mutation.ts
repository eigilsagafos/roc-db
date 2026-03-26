import type { MutationRef } from "./MutationRef"
import type { Ref } from "./Ref"

export type Mutation = {
    ref: MutationRef
    // name: z.ZodLiteral<string>
    operation: {
        name: string
        version: number
    }
    timestamp: string
    debounceCount: number
    payload: any
    changeSetRef?: Ref
    log: any
}
