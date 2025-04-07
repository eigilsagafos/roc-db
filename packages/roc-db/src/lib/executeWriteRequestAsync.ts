import type { EntityN } from "../createAdapter"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { WriteRequest } from "../types/WriteRequest"
import { createMutationAsync } from "./createMutationAsync"
import { defaultBeginRequest } from "./defaultBeginRequest"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { initializeChangeSet } from "./initializeChangeSet"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { validateWriteRequestAndParsePayload } from "./validateWriteRequestAndParsePayload"
import { WriteTransaction } from "./WriteTransaction"

export const executeWriteRequestAsyncInternal = async (
    request: WriteRequest,
    engineOpts: any,
    adapterOpts: AdapterOptions,
    payload: any,
) => {
    const [mutation, optimisticRefs] = await createMutationAsync(
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
    await initializeChangeSet(txn)
    const functions = request.callback(txn, adapterOpts.session)
    const res = await runAsyncFunctionChain(functions)
    const savedMutation = await txn.commit()

    return [res, savedMutation]
}

export const executeWriteRequestAsync = async <
    Request extends WriteRequest,
    EngineOpts extends {},
    Entities extends readonly EntityN[],
    AdapterOpts extends AdapterOptions,
>(
    request: Request,
    engineOpts: EngineOpts,
    adapterOpts: AdapterOpts,
) => {
    const payload = validateWriteRequestAndParsePayload(request)
    const begin = adapterOpts.functions.begin || defaultBeginTransaction
    return begin(engineOpts, async (engineOptsTxn: EngineOpts) => {
        const beginRequest =
            adapterOpts.functions.beginRequest || defaultBeginRequest
        const result = await beginRequest(
            request,
            engineOptsTxn,
            async engineOptsReq => {
                return executeWriteRequestAsyncInternal(
                    request,
                    engineOptsReq,
                    adapterOpts,
                    payload,
                )
            },
        )
        if (adapterOpts.functions.end) {
            await adapterOpts.functions.end(engineOptsTxn)
        }
        return result
    })
}
