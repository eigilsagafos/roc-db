import type { AdapterOptions } from "../types/AdapterOptions"
import type { ReadRequest } from "../types/ReadRequest"
import { defaultBeginRequest } from "./defaultBeginRequest"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { initializeChangeSet } from "./initializeChangeSet"
import { ReadTransaction } from "./ReadTransaction"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"

const parseAndValidatePayload = (request: ReadRequest) => {
    return request.operation.payloadSchema.parse(request.payload)
}

export const executeReadRequestAsync = async <
    Request extends ReadRequest,
    EngineOpts extends {},
    Entities extends [],
    AdapterOpts extends AdapterOptions,
>(
    request: Request,
    engineOpts: EngineOpts,
    adapter: AdapterOpts,
) => {
    const payload = parseAndValidatePayload(request)
    const begin = adapter.functions.begin || defaultBeginTransaction
    return begin(engineOpts, async engineOptsTxn => {
        const beginRequest =
            adapter.functions.beginRequest || defaultBeginRequest
        const result = beginRequest(
            request,
            engineOptsTxn,
            async engineOptsReq => {
                const txn = new ReadTransaction(
                    request,
                    engineOptsReq,
                    adapter,
                    payload,
                )

                await initializeChangeSet(txn)

                const functions = request.operation.callback(
                    txn,
                    adapter.session,
                )

                const res = runAsyncFunctionChain(functions)

                return res
            },
        )

        return result
    })
}
