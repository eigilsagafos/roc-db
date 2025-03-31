import { Ref } from "./Ref"

export type ReadRequest<Payload = any, Session = any> = {
    type: "read"
    payload: Payload
    settings: {}
    callback: (s: string, session: Session) => {}
    changeSetRef: Ref | null
}
