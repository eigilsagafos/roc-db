import { AdapterOptions } from "../types/AdapterOptions"
import { ReadRequest } from "../types/ReadRequest"
import { initChangeSetAsync } from "./initChangeSetAsync"
import { ReadTransaction } from "./ReadTransaction"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"

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
    if (adapterOpts.functions.begin) {
        engineOpts = await adapterOpts.functions.begin(request, engineOpts)
    }

    const txn = new ReadTransaction(request, engineOpts, adapterOpts, payload)

    if (request.changeSetRef) {
        await initChangeSetAsync(txn)
    }

    const functions = request.callback(txn, (...args) => args)

    const res = runAsyncFunctionChain(functions)
    if (adapterOpts.functions.end) {
        await adapterOpts.functions.end(txn)
    }
    return res
}
