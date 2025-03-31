import type { AdapterOptions } from "../types/AdapterOptions"
import type { ReadRequest } from "../types/ReadRequest"
import { defaultBegin } from "./defaultBegin"
import { initChangeSetSync } from "./initChangeSetSync"
import { ReadTransaction } from "./ReadTransaction"
import { runSyncFunctionChain } from "./runSyncFunctionChain"
import { shouldInitChangeSet } from "./shouldInitChangeSet"

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
    const begin = adapterOpts.functions.begin || defaultBegin
    return begin(request, engineOpts, engineOpts => {
        const txn = new ReadTransaction<
            Request,
            EngineOpts,
            Entities,
            AdapterOpts
        >(request, engineOpts, adapterOpts, payload)
        if (shouldInitChangeSet(txn)) {
            initChangeSetSync(txn)
        }
        const res = runSyncFunctionChain(
            request.callback(txn, adapterOpts.session),
        )
        if (adapterOpts.functions.end) {
            adapterOpts.functions.end(txn)
        }
        return res
    })
}
