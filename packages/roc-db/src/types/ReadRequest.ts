import type { ReadOperation } from "./ReadOperation"
import type { Ref } from "./Ref"

export type ReadRequest<Payload = any, Session = any> = {
    type: "read"
    operation: ReadOperation
    payload: Payload
    changeSetRef: Ref | null
}
