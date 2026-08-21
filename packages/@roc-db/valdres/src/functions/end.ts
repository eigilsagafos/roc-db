import type { EndFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

// Runs as the last statement inside the `store.txn` callback `begin` opened.
// It used to call `rootTxn.commit()` there; valdres dropped manual commit from
// the public transaction surface in 1.0.0-beta.17, and the call was redundant
// anyway — `store.txn` commits once its callback returns.
//
// NOTE: the detach below is currently unreachable. `beginRequest` sets
// `scopedStoreAlreadyAttachedBeforeBegin` on the engine options it passes to
// the *request* callback, but core hands `end` the options from `begin`, which
// never carry the flag. So the scope lease `onChangeSetInit` takes out is never
// released. Pre-existing, and left alone here: changing scope lifetime is a
// separate call from the valdres 1.0 migration.
export const end: EndFunction<ValdresEngine> = engineOpts => {
    const txnEngine = engineOpts as unknown as ValdresTxnEngine
    if (
        txnEngine.scopedStore &&
        txnEngine.scopedStoreAlreadyAttachedBeforeBegin
    ) {
        txnEngine.scopedStore.detach()
    }
    return engineOpts as unknown as ValdresEngine
}
