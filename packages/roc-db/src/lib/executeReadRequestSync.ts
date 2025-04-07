import type { AdapterOptions } from "../types/AdapterOptions"
import type { ReadRequest } from "../types/ReadRequest"
import { defaultBeginRequest } from "./defaultBeginRequest"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { initializeChangeSet } from "./initializeChangeSet"
import { ReadTransaction } from "./ReadTransaction"
import { runSyncFunctionChain } from "./runSyncFunctionChain"

const parseAndValidatePayload = request => {
    return request.schema.parse(request.payload)
}

export const executeReadRequestSync = <
    Request extends ReadRequest,
    EngineOpts extends {},
    Entities extends [],
    AdapterOpts extends AdapterOptions,
>(
    request: Request,
    engineOpts: EngineOpts,
    adapterOpts: AdapterOpts,
) => {
    const payload = parseAndValidatePayload(request)
    const begin = adapterOpts.functions.begin || defaultBeginTransaction
    return begin(engineOpts, engineOptsTx => {
        const beginRequest =
            adapterOpts.functions.beginRequest || defaultBeginRequest
        const res = beginRequest(request, engineOptsTx, engineOptsReq => {
            const txn = new ReadTransaction(
                request,
                engineOptsReq,
                adapterOpts,
                payload,
            )

            initializeChangeSet(txn)
            const res = runSyncFunctionChain(
                request.callback(txn, adapterOpts.session),
            )
            return res
        })
        if (adapterOpts.functions.end) {
            adapterOpts.functions.end(engineOptsTx)
        }
        return res
    })
}
