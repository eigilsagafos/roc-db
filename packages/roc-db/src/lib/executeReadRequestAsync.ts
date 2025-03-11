import type { AdapterOptions } from "../types/AdapterOptions"
import type { ReadRequest } from "../types/ReadRequest"
import { initChangeSetAsync } from "./initChangeSetAsync"
import { ReadTransaction } from "./ReadTransaction"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { defaultBegin } from "./defaultBegin"

const parseAndValidatePayload = operation => {
    return operation.schema.parse(operation.payload)
}

export const executeReadRequestAsync = async <
    Request extends ReadRequest,
    EngineOpts extends {},
    Entities extends [],
    AdapterOpts extends AdapterOptions<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >,
>(
    request: Request,
    engineOpts: EngineOpts,
    adapterOpts: AdapterOpts,
) => {
    const payload = parseAndValidatePayload(request)
    const begin = adapterOpts.functions.begin || defaultBegin

    return begin(request, engineOpts, async engineOpts => {
        const txn = new ReadTransaction(
            request,
            engineOpts,
            adapterOpts,
            payload,
        )
        if (request.changeSetRef) {
            await initChangeSetAsync(txn)
        }
        const functions = request.callback(txn)

        const res = runAsyncFunctionChain(functions)
        if (adapterOpts.functions.end) {
            await adapterOpts.functions.end(txn)
        }
        return res
    })
}
