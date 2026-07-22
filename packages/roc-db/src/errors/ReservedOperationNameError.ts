import { BadRequestError } from "./BadRequestError"

/**
 * Thrown at adapter construction when a caller registers an operation whose
 * name is reserved by a built-in (`undo`, `redo`, `pageMutations`,
 * `pageEntities`). These are always provided by the adapter, so registering
 * your own under the same name would silently shadow the built-in — it's
 * rejected outright instead.
 */
export class ReservedOperationNameError extends BadRequestError {
    operationName: string
    constructor(operationName: string) {
        super(
            `Operation name "${operationName}" is reserved by a built-in operation and cannot be registered.`,
        )
        this.name = "ReservedOperationNameError"
        this.operationName = operationName
    }
}
