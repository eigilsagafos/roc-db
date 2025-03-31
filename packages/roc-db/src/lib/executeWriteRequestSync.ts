import { runSyncFunctionChain } from "./runSyncFunctionChain"
import { WriteTransaction } from "./WriteTransaction"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { RocRequest } from "../types/RocRequest"
import { createMutationSync } from "./createMutationSync"
import { initChangeSetSync } from "./initChangeSetSync"
import { defaultBegin } from "./defaultBegin"
import { shouldInitChangeSet } from "./shouldInitChangeSet"
import { validateWriteRequestAndParsePayload } from "./validateWriteRequestAndParsePayload"

export const executeWriteRequestSync = <
    Request extends RocRequest,
    EngineOpts extends {},
    Entities extends readonly [],
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
    const payload = validateWriteRequestAndParsePayload(request)
    const begin = adapterOpts.functions.begin || defaultBegin

    return begin(request, engineOpts, engineOpts => {
        const [mutation, optimisticRefs] = createMutationSync(
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
        if (shouldInitChangeSet(txn)) {
            initChangeSetSync(txn)
        }
        const res = runSyncFunctionChain(
            request.callback(txn, adapterOpts.session),
        )
        const finalizedMutation = txn.finalizedMutation()
        const savedMutation = adapterOpts.functions.saveMutation(
            txn,
            finalizedMutation,
        )
        if (adapterOpts.functions.end) {
            adapterOpts.functions.end(txn)
        }
        return [res, savedMutation]
    })
}
