import type { EntityN } from "../createAdapter"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { WriteRequest } from "../types/WriteRequest"
import { createMutationAsync } from "./createMutationAsync"
import { defaultBeginRequest } from "./defaultBeginRequest"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { initializeChangeSet } from "./initializeChangeSet"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { validateOutput } from "./validateOutput"
import { validateWriteRequestAndParsePayload } from "./validateWriteRequestAndParsePayload"
import { WriteTransaction } from "./WriteTransaction"

export const executeWriteRequestAsyncInternal = async (
    request: WriteRequest,
    engineOpts: any,
    adapter: AdapterOptions,
    payload: any,
) => {
    const [mutation, optimisticRefs] = await createMutationAsync(
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
    )
    await initializeChangeSet(txn)
    const functions = request.operation.callback(txn, adapter.session)
    const res = await runAsyncFunctionChain(functions)
    if (request.operation.outputSchema) {
        validateOutput(res, request)
    }
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
    adapter: AdapterOpts,
) => {
    const payload = validateWriteRequestAndParsePayload(request)
    const begin = adapter.functions.begin || defaultBeginTransaction
    return begin(engineOpts, async (engineOptsTxn: EngineOpts) => {
        const beginRequest =
            adapter.functions.beginRequest || defaultBeginRequest
        const result = await beginRequest(
            request,
            engineOptsTxn,
            async engineOptsReq => {
                return executeWriteRequestAsyncInternal(
                    request,
                    engineOptsReq,
                    adapter,
                    payload,
                )
            },
        )

        return result
    })
}
