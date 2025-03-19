import type { Transaction } from "../types/Transaction"
import { parseAndValidatePayload } from "./executeWriteRequestSync"
import { runSyncFunctionChain } from "./runSyncFunctionChain"
import { WriteTransaction } from "./WriteTransaction"

export const initChangeSetSync = (txn: Transaction<any, any, any, any>) => {
    const res = txn.adapterOpts.functions.getChangeSetMutations(
        txn,
        txn.request.changeSetRef,
    )

    if (res.length) {
        for (const mutation of res) {
            const operation = txn.adapterOpts.operations.find(
                o => o.operationName === mutation.name,
            )
            if (!operation) {
                throw new Error(`Operation "${mutation.name}" not found`)
            }
            const request = operation(
                mutation.payload,
                txn.request.changeSetRef,
            )
            const payload = parseAndValidatePayload(request)
            const tmpTxn = new WriteTransaction(
                request,
                txn.engineOpts,
                txn.adapterOpts,
                payload,
                mutation,
                mutation.log,
            )
            runSyncFunctionChain(request.callback(tmpTxn))
        }
    }
    if (txn.adapterOpts.changeSetRef && txn.adapterOpts.initChangeSetOnce) {
        txn.adapterOpts.changeSetInitialized = true
    }
}
