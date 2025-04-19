import { ConflictError } from "./ConflictError"

export const createUniqueConstraintConflictError = (
    entity: string,
    field?: string,
    value?: any,
) => {
    let message = `Unique constraint violation for entity '${entity}'`
    if (field) {
        message += ` on field '${field}'`
    }
    if (value) {
        message += ` with value '${value}'`
    }
    return new ConflictError(message)
}
