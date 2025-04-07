import type { ValdresTransaction } from "../types/ValdresTransaction"

export const end = (engineOpts: ValdresTransaction) => {
    engineOpts.rootTxn.commit()
    if (
        engineOpts.scopedStore &&
        engineOpts.scopedStoreAlreadyAttachedBeforeBegin
    ) {
        engineOpts.scopedStore.detach()
    }
}
