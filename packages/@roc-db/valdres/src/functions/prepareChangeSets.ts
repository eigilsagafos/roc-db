import type { PrepareChangeSetsFunction } from "roc-db"
import type { ValdresEngine } from "../types/ValdresEngine"

// valdres only opens a named scope outside a transaction, so open every
// changeSet scope a batch writes to before the batch's transaction starts.
// Inside a caller's transaction the scopes have to be open already.
export const prepareChangeSets: PrepareChangeSetsFunction<ValdresEngine> = (
    engineOpts,
    changeSetRefs,
) => {
    const { store } = engineOpts
    if (!store || engineOpts.txn) return
    for (const changeSetRef of changeSetRefs) store.scope(changeSetRef)
}
