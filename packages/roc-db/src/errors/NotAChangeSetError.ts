import type { Ref } from "../types/Ref"
import { BadRequestError } from "./BadRequestError"

/**
 * Thrown (in strict mode) when a ref used as a changeSetRef resolves to an
 * entity kind that is not declared as a changeSet (`changeSet: true`). Catches
 * e.g. passing a `Post` ref where a `Draft` (changeSet) ref was expected.
 */
export class NotAChangeSetError extends BadRequestError {
    changeSetRef: Ref
    entityKind: string
    constructor(changeSetRef: Ref, entityKind: string) {
        super(
            `changeSetRef '${changeSetRef}' resolves to entity '${entityKind}', which is not declared as a changeSet (changeSet: true).`,
        )
        this.name = "NotAChangeSetError"
        this.changeSetRef = changeSetRef
        this.entityKind = entityKind
    }
}
