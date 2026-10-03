import type { RefByUniqueFieldFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"
import { uniqueHolder } from "../lib/uniqueHolder"

export const refByUniqueField: RefByUniqueFieldFunction<ValdresEngine> = (
    txn,
    entity,
    field,
    fieldIndex,
    value,
) => {
    const engine = txn.engineOpts as ValdresTxnEngine
    if (!engine.entityUniqueAtom) throw new Error("No entityUniqueAtom")
    return uniqueHolder(engine.txn, engine, entity, field, value)
}
