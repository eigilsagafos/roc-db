import type { Ref } from "roc-db"
import type { Transaction } from "valdres"
import type { ValdresEngine } from "../types/ValdresEngine"

// The ref holding a unique value, as seen through `txn`. A changeSet scope
// inherits the root's unique entries, and resetting an entry in the scope falls
// back to the root's, so an entry can name an entity the draft has since
// changed or deleted. It only counts while that entity, seen through the same
// transaction, still carries the value.
export const uniqueHolder = (
    txn: Transaction,
    { entityAtom, entityUniqueAtom }: ValdresEngine,
    entity: string,
    key: string,
    value: string | number | boolean,
): Ref | null => {
    const ref = txn.get(entityUniqueAtom(entity, key, value))
    if (!ref) return null
    const holds = txn
        .get(entityAtom(ref))
        ?.__?.unique?.some(
            ([k, v]: [string, unknown]) => k === key && v === value,
        )
    return holds ? ref : null
}
