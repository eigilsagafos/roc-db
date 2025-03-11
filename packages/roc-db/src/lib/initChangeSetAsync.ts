import { parseAndValidatePayload } from "./executeWriteRequestSync"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { WriteTransaction } from "./WriteTransaction"

export const initChangeSetAsync = async txn => {
    const res = await txn.adapterOpts.functions.getChangeSetMutations(
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
            // const functions = request.callback(txn, (...args) => args)
            const res = await runAsyncFunctionChain(request.callback(tmpTxn))
        }
    }
}
