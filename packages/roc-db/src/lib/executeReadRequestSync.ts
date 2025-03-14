import { AdapterOptions } from "../types/AdapterOptions"
import type { ReadRequest } from "../types/ReadRequest"
import { initChangeSetSync } from "./initChangeSetSync"
import { ReadTransaction } from "./ReadTransaction"
import { runSyncFunctionChain } from "./runSyncFunctionChain"

const parseAndValidatePayload = request => {
    return request.schema.parse(request.payload)
}

export const executeReadRequestSync = <
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
        engineOpts = adapterOpts.functions.begin(request, engineOpts)
    }

    const txn = new ReadTransaction<Request, EngineOpts, Entities, AdapterOpts>(
        request,
        engineOpts,
        adapterOpts,
        payload,
    )
    if (request.changeSetRef) {
        initChangeSetSync(txn)
    }
    const res = runSyncFunctionChain(request.callback(txn))
    if (adapterOpts.functions.end) {
        adapterOpts.functions.end(txn)
    }
    return res
}
