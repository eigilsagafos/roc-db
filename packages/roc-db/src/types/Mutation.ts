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
    // Set by generateMutationDoc from the adapter session.
    identityRef: string
    sessionRef: Ref | null
    // null while optimistic; the persisted timestamp once written.
    persistedAt: string | null
    // Set by finalizeMutation when a changeSet is applied.
    appliedAt?: string
}
