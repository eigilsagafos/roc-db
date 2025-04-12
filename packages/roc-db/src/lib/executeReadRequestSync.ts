import type { AdapterOptions } from "../types/AdapterOptions"
import type { ReadRequest } from "../types/ReadRequest"
import type { WriteRequest } from "../types/WriteRequest"
import { defaultBeginRequest } from "./defaultBeginRequest"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { initializeChangeSet } from "./initializeChangeSet"
import { ReadTransaction } from "./ReadTransaction"
import { runSyncFunctionChain } from "./runSyncFunctionChain"

const parseAndValidatePayload = (request: WriteRequest) => {
    return request.operation.payloadSchema.parse(request.payload)
}

export const executeReadRequestSync = <
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
    return begin(engineOpts, engineOptsTx => {
        const beginRequest =
            adapter.functions.beginRequest || defaultBeginRequest
        const res = beginRequest(request, engineOptsTx, engineOptsReq => {
            const txn = new ReadTransaction(
                request,
                engineOptsReq,
                adapter,
                payload,
            )

            initializeChangeSet(txn)
            const res = runSyncFunctionChain(
                request.operation.callback(txn, adapter.session),
            )
            return res
        })
        if (adapter.functions.end) {
            adapter.functions.end(engineOptsTx)
        }
        return res
    })
}
