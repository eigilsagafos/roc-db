import { type Ref } from "roc-db"
import type { ValdresTransaction } from "../types/ValdresTransaction"

export const readEntity = (txn: ValdresTransaction, ref: Ref) => {
    const { entityAtom } = txn.engineOpts
    // We use rootTxn here becuase if we are in a changeSet and read a change set value it should already be in memory.
    return txn.engineOpts.rootTxn.get(entityAtom(ref))
}
