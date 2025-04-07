import type { AdapterOptions } from "../types/AdapterOptions"
import type { WriteRequest } from "../types/WriteRequest"
import { createMutationSync } from "./createMutationSync"
import { defaultBeginRequest } from "./defaultBeginRequest"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { initializeChangeSet } from "./initializeChangeSet"
import { runSyncFunctionChain } from "./runSyncFunctionChain"
import { validateWriteRequestAndParsePayload } from "./validateWriteRequestAndParsePayload"
import { WriteTransaction } from "./WriteTransaction"

export const executeWriteRequestSyncInternal = (
    request: WriteRequest,
    engineOpts: any,
    adapterOpts: AdapterOptions,
    payload: any,
) => {
    const [mutation, optimisticRefs] = createMutationSync(
        request,
        engineOpts,
        adapterOpts,
        payload,
    )
    const txn = new WriteTransaction(
        request,
        engineOpts,
        adapterOpts,
        payload,
        mutation,
        optimisticRefs,
    )
    initializeChangeSet(txn)
    const res = runSyncFunctionChain(request.callback(txn, adapterOpts.session))
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
    adapterOpts: AdapterOpts,
) => {
    const payload = validateWriteRequestAndParsePayload(request)
    const begin = adapterOpts.functions.begin || defaultBeginTransaction
    return begin(engineOpts, engineOptsTxn => {
        const beginRequest =
            adapterOpts.functions.beginRequest || defaultBeginRequest
        const res = beginRequest(request, engineOptsTxn, engineOptsReq =>
            executeWriteRequestSyncInternal(
                request,
                engineOptsReq,
                adapterOpts,
                payload,
            ),
        )
        if (adapterOpts.functions.end) {
            adapterOpts.functions.end(engineOptsTxn)
        }
        return res
    })
}
