import type { ReadEntityFunctiun } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const readEntity: ReadEntityFunctiun<ValdresEngine> = (txn, ref) => {
    const { entityAtom, rootTxn } = txn.engineOpts as ValdresTxnEngine
    // We use rootTxn here becuase if we are in a changeSet and read a change set value it should already be in memory.
    return rootTxn.get(entityAtom(ref))
}
