import { BadRequestError } from "./BadRequestError"

/**
 * Thrown at adapter construction when the same operation is registered more
 * than once with the same name AND version. Registering multiple *versions* of
 * an operation (same name, different `version`) is supported and expected — but
 * two registrations that share a (name, version) are ambiguous and almost
 * always an accidental double-registration.
 */
export class DuplicateOperationError extends BadRequestError {
    operationName: string
    version: number
    constructor(operationName: string, version: number) {
        super(
            `Operation "${operationName}" is registered more than once with version ${version}. Register each version once; bump 'version' to add a new revision.`,
        )
        this.name = "DuplicateOperationError"
        this.operationName = operationName
        this.version = version
    }
}
