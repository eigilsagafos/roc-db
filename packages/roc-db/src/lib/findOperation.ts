import type { Mutation } from "../types/Mutation"
import type { WriteOperation } from "../types/WriteOperation"

export const findOperation = (
    operations: WriteOperation[],
    mutation: Mutation,
) => {
    const operation = operations.find(
        operation => operation.name === mutation.operation.name,
    )
    if (operation) return operation
    throw new Error(`Operation "${mutation.operation.name}" not found`)
}
