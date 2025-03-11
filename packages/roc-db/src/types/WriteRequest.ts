import type { Mutation } from "./Mutation"
import type { Ref } from "./Ref"

export type WriteRequest<Payload = any> = {
    type: "write"
    payload: Payload
    settings: {
        debounce?: number
    }
    changeSetRef: Ref | null
    callback: (s: string) => {}
    optimisticMutation?: Mutation
}
