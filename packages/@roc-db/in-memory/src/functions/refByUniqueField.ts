import type { RefByUniqueFieldFunction, Transaction } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

// The runtime returns the stored Ref or falls through to `undefined` when the
// key is absent; the contract types this as `Ref | null` (the core caller only
// does a truthy check, so undefined/null are equivalent). Cast the function
// value to conform without altering the runtime return.
export const refByUniqueField = ((
    txn: Transaction<InMemoryEngine>,
    entity: string,
    field: string,
    fieldIndex: number,
    value: any,
) => {
    const key = `${entity}:${field}:${JSON.stringify(value)}`
    const { entitiesUnique } = txn.engineOpts
    if (entitiesUnique.has(key)) {
        return entitiesUnique.get(key)
    }
}) as RefByUniqueFieldFunction<InMemoryEngine>
