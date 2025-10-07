import type { AdapterOptions } from "../types/AdapterOptions"
import type { WriteRequest } from "../types/WriteRequest"
import { createMutationSync } from "./createMutationSync"
import { defaultBeginRequest } from "./defaultBeginRequest"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { initializeChangeSet } from "./initializeChangeSet"
import { runSyncFunctionChain } from "./runSyncFunctionChain"
import { validateOutput } from "./validateOutput"
import { validateWriteRequestAndParsePayload } from "./validateWriteRequestAndParsePayload"
import { WriteTransaction } from "./WriteTransaction"

export const executeWriteRequestSyncInternal = (
    request: WriteRequest,
    engineOpts: any,
    adapter: AdapterOptions,
    payload: any,
    batchRequestChangeSet: any,
) => {
    const [mutation, optimisticRefs] = createMutationSync(
        request,
        engineOpts,
        adapter,
        payload,
    )
    const txn = new WriteTransaction(
        request,
        engineOpts,
        adapter,
        payload,
        mutation,
        optimisticRefs,
        batchRequestChangeSet,
    )

    if (batchRequestChangeSet) {
        txn.changeSetInitialized = true
    } else {
        initializeChangeSet(txn)
    }

    const res = runSyncFunctionChain(
        request.operation.callback(txn, adapter.session),
    )
    if (request.operation.outputSchema) {
        validateOutput(res, request)
    }
    const savedMutation = txn.commit()
    return [res, savedMutation]
}

export const executeWriteRequestSync = <
    Request extends WriteRequest,
    EngineOpts extends {},
    Entities extends readonly [],
    AdapterOpts extends AdapterOptions,
>(
    request: Request,
    engineOpts: EngineOpts,
    adapter: AdapterOpts,
) => {
    const payload = validateWriteRequestAndParsePayload(request)
    const begin = adapter.functions.begin || defaultBeginTransaction
    return begin(engineOpts, engineOptsTxn => {
        const beginRequest =
            adapter.functions.beginRequest || defaultBeginRequest
        const res = beginRequest(request, engineOptsTxn, engineOptsReq =>
            executeWriteRequestSyncInternal(
                request,
                engineOptsReq,
                adapter,
                payload,
            ),
        )
        if (adapter.functions.end) {
            adapter.functions.end(engineOptsTxn)
        }
        return res
    })
}
