import type { PrepareChangeSetsFunction } from "roc-db"
import type { ValdresEngine } from "../types/ValdresEngine"
import { openChangeSetScope } from "../lib/scopeTransaction"

// valdres only opens a named scope outside a transaction, so open every
// changeSet scope a batch writes to before the batch's transaction starts,
// replacing any built from a version the changeSet no longer names. Inside a
// caller's transaction the scopes have to be open already.
export const prepareChangeSets: PrepareChangeSetsFunction<ValdresEngine> = (
    engineOpts,
    changeSetRefs,
) => {
    const { store, entityAtom } = engineOpts
    if (!store || engineOpts.txn) return
    for (const changeSetRef of changeSetRefs) {
        const changeSet: any = store.get(entityAtom(changeSetRef))
        openChangeSetScope(store, changeSetRef, changeSet?.parents?.version)
    }
}
