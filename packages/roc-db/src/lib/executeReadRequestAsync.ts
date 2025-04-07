import type { AdapterOptions } from "../types/AdapterOptions"
import type { ReadRequest } from "../types/ReadRequest"
import { defaultBeginRequest } from "./defaultBeginRequest"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { initializeChangeSet } from "./initializeChangeSet"
import { ReadTransaction } from "./ReadTransaction"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"

const parseAndValidatePayload = operation => {
    return operation.schema.parse(operation.payload)
}

export const executeReadRequestAsync = async <
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
    return begin(engineOpts, async engineOptsTxn => {
        const beginRequest =
            adapterOpts.functions.beginRequest || defaultBeginRequest
        const result = beginRequest(
            request,
            engineOptsTxn,
            async engineOptsReq => {
                const txn = new ReadTransaction(
                    request,
                    engineOptsReq,
                    adapterOpts,
                    payload,
                )

                await initializeChangeSet(txn)

                const functions = request.callback(txn, adapterOpts.session)

                const res = runAsyncFunctionChain(functions)
                return res
            },
        )
        if (adapterOpts.functions.end) {
            await adapterOpts.functions.end(engineOptsTxn)
        }
        return result
    })
}
