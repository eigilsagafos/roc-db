import type { Ref } from "../types/Ref"
import { BadRequestError } from "./BadRequestError"

/**
 * Thrown (in strict mode) when a changeSet's version parent resolves to an
 * entity kind that is not declared as a version (`version: true`) — so it
 * carries no base snapshot to resolve from.
 */
export class NotAVersionError extends BadRequestError {
    versionRef: Ref
    entityKind: string
    constructor(versionRef: Ref, entityKind: string) {
        super(
            `version ref '${versionRef}' resolves to entity '${entityKind}', which is not declared as a version (version: true).`,
        )
        this.name = "NotAVersionError"
        this.versionRef = versionRef
        this.entityKind = entityKind
    }
}
