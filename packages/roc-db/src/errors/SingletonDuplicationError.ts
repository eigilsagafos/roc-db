import { BadRequestError } from "./BadRequestError"

/**
 * Thrown by `duplicateChangeSetMutations` when the source changeSet creates a singleton
 * entity. A singleton's ref is the bare entity name with no id, so a second
 * instance cannot coexist with the original — there is no "fresh" ref to mint.
 */
export class SingletonDuplicationError extends BadRequestError {
    entityKind: string
    constructor(entityKind: string) {
        super(
            `Cannot duplicate a changeSet that creates singleton entity '${entityKind}': a second instance cannot coexist.`,
        )
        this.name = "SingletonDuplicationError"
        this.entityKind = entityKind
    }
}
