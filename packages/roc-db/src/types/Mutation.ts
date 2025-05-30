import { z } from "zod"
import { MutationRef } from "./MutationRef"
import { Ref } from "./Ref"

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
