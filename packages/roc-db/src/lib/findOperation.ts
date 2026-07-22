import type { Mutation } from "../types/Mutation"
import type { WriteOperation } from "../types/WriteOperation"

// Resolve the operation used to replay a mutation. Matching is version-aware:
// a mutation records the `operation.version` it was authored with, and replay
// must run that exact version's callback — not whatever the latest registered
// version happens to be. This lets an operation's logic evolve (register a new
// version) while historical mutations in an un-applied changeSet still replay
// with the code that created them.
//
// `version` defaults to 1 to stay backwards compatible with mutations authored
// before the field existed (the mutation schema also defaults it to 1).
export const findOperation = (
    operations: WriteOperation[],
    mutation: Mutation,
) => {
    const { name } = mutation.operation
    const version = mutation.operation.version ?? 1
    const operation = operations.find(
        operation => operation.name === name && operation.version === version,
    )
    if (operation) return operation
    // Distinguish "this version was never registered" from "no such operation"
    // so a missing version bump is obvious rather than looking like a typo.
    if (operations.some(operation => operation.name === name)) {
        throw new Error(
            `Operation "${name}" version ${version} not found. Register this version so mutations authored with it can be replayed.`,
        )
    }
    throw new Error(`Operation "${name}" not found`)
}
