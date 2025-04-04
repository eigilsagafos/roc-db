import type { EntityN } from "../createAdapter"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { RocRequest } from "../types/RocRequest"
import { createMutationAsync } from "./createMutationAsync"
import { defaultBegin } from "./defaultBegin"
import { initChangeSetAsync } from "./initChangeSetAsync"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { shouldInitChangeSet } from "./shouldInitChangeSet"
import { validateWriteRequestAndParsePayload } from "./validateWriteRequestAndParsePayload"
import { WriteTransaction } from "./WriteTransaction"

export const executeWriteRequestAsync = async <
    Request extends RocRequest,
    EngineOpts extends {},
    Entities extends readonly EntityN[],
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

    return begin(request, engineOpts, async (engineOpts: EngineOpts) => {
        const [mutation, optimisticRefs] = await createMutationAsync(
            request,
            engineOpts,
            adapterOpts,
            payload,
        )
        const txn = new WriteTransaction<
            Request,
            EngineOpts,
            Entities,
            AdapterOpts
        >(request, engineOpts, adapterOpts, payload, mutation, optimisticRefs)
        if (shouldInitChangeSet(txn)) {
            await initChangeSetAsync(txn)
        }
        const functions = request.callback(txn, adapterOpts.session)
        const res = await runAsyncFunctionChain(functions)
        const finalizedMutation = await txn.finalizedMutation()
        const savedMutation = await adapterOpts.functions.saveMutation(
            txn,
            finalizedMutation,
        )
        if (adapterOpts.functions.end) {
            await adapterOpts.functions.end(txn)
        }
        return [res, savedMutation]
    })

    // if (adapterOpts.functions.begin) {
    //     engineOpts = await adapterOpts.functions.begin(request, engineOpts)
    // }
}
