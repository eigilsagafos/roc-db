import type { EndFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const end: EndFunction<ValdresEngine> = engineOpts => {
    const txnEngine = engineOpts as unknown as ValdresTxnEngine
    txnEngine.rootTxn.commit()
    if (
        txnEngine.scopedStore &&
        txnEngine.scopedStoreAlreadyAttachedBeforeBegin
    ) {
        ;(txnEngine.scopedStore as unknown as { detach: () => void }).detach()
    }
    return engineOpts as unknown as ValdresEngine
}
