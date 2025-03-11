import { EntityN } from "../createAdapter"
import { AdapterOptions } from "../types/AdapterOptions"
import { RocRequest } from "../types/RocRequest"
import { createMutationAsync } from "./createMutationAsync"
import { parseAndValidatePayload } from "./executeWriteRequestSync"
import { initChangeSetAsync } from "./initChangeSetAsync"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
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
    const payload = parseAndValidatePayload(request)
    if (adapterOpts.functions.begin) {
        engineOpts = await adapterOpts.functions.begin(request, engineOpts)
    }
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
    if (request.changeSetRef) {
        await initChangeSetAsync(txn)
    }
    const functions = request.callback(txn, (...args) => args)
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
}
