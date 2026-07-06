import type { Ref } from "../types/Ref"
import { BadRequestError } from "./BadRequestError"

/**
 * Thrown when a changeSet's version parent resolves to an entity kind that is
 * not declared as a version (`version: true`) — so it carries no base snapshot
 * to resolve from. Enforced at adapter construction (registration-time
 * cross-entity check) and at runtime when resolving a changeSet's base.
 */
export class NotAVersionError extends BadRequestError {
    versionRef: Ref
    entityKind: string
    constructor(versionRef: Ref, entityKind: string) {
        super(
            `version reference '${versionRef}' targets entity '${entityKind}', which is not declared as a version (version: true).`,
        )
        this.name = "NotAVersionError"
        this.versionRef = versionRef
        this.entityKind = entityKind
    }
}
