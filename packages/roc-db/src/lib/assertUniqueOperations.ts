import { DuplicateOperationError } from "../errors/DuplicateOperationError"
import type { Operation } from "../types/Operation"

// Registration-time check: no two operations may share the same (name, version).
// Multiple versions of an operation (same name, different version) are allowed —
// that's how operation logic evolves while old mutations still replay — but a
// repeated (name, version) is an accidental double-registration. Read operations
// carry no version, so they are keyed at version 1 (the write/mutation default).
export const assertUniqueOperations = (operations: readonly Operation[]) => {
    const seen = new Set<string>()
    for (const operation of operations) {
        const version = (operation as { version?: number }).version ?? 1
        const key = `${operation.name}:${version}`
        if (seen.has(key)) {
            throw new DuplicateOperationError(operation.name, version)
        }
        seen.add(key)
    }
}
