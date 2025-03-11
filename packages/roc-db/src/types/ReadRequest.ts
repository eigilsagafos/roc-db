import { Ref } from "./Ref"

export type ReadRequest<Payload = any> = {
    type: "read"
    payload: Payload
    settings: {}
    callback: (s: string) => {}
    changeSetRef: Ref | null
}
