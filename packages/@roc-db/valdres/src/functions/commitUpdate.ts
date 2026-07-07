import type { UpdateEntityFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const commitUpdate: UpdateEntityFunction<ValdresEngine> = (
    txn,
    ref,
    document,
) => {
    const { entityAtom, txn: valdresTxn } = txn.engineOpts as ValdresTxnEngine
    valdresTxn.set(entityAtom(ref), document)
}
