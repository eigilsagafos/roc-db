import type { RefByUniqueFieldFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const refByUniqueField: RefByUniqueFieldFunction<ValdresEngine> = (
    txn,
    entity,
    field,
    fieldIndex,
    value,
) => {
    const { entityUniqueAtom, txn: valdresTxn } =
        txn.engineOpts as ValdresTxnEngine
    if (!entityUniqueAtom) throw new Error("No entityUniqueAtom")
    return valdresTxn.get(entityUniqueAtom(entity, field, value))
}
