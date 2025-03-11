import { Ref } from "../types/Ref"

export class NotFoundError extends Error {
    constructor(ref: Ref) {
        super(`Entity not found: ${ref}`)
        this.name = "NotFoundError"
    }
}
