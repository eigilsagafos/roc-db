import type { OnChangeSetAppliedFunction } from "roc-db"
import type { Store } from "valdres"
import type { ValdresEngine } from "../types/ValdresEngine"

export const onChangeSetApplied: OnChangeSetAppliedFunction<ValdresEngine> = (
    txn,
    changeSetRef,
) => {
    const store = txn.engineOpts.store as Store
    const scopes = store.data?.scopes as Record<string, any>
    if (scopes?.[changeSetRef]?.txnCache) {
        delete scopes?.[changeSetRef]
    }
}
