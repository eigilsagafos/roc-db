import { runSyncFunctionChain } from "./runSyncFunctionChain"
import { WriteTransaction } from "./WriteTransaction"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { RocRequest } from "../types/RocRequest"
import { createMutationSync } from "./createMutationSync"
import { initChangeSetSync } from "./initChangeSetSync"
import { defaultBegin } from "./defaultBegin"
import { shouldInitChangeSet } from "./shouldInitChangeSet"

type TupleToArgs<T extends any[]> = Extract<
    [[], ...{ [I in keyof T]: [arg: T[I]] }],
    Record<keyof T, any>
>
export type TupleToChain<T extends any[]> = {
    [I in keyof T]: (...args: Extract<TupleToArgs<T>[I], any[]>) => T[I]
}
export type Last<T extends any[]> = T extends [...infer _, infer L] ? L : never

const validateOptimisticMutation = (mutation, mutationName) => {
    if (mutation.ref) {
        if (mutation.name !== mutationName)
            throw new Error("Optimistic mutation name does not match")
    }
}

export const parseAndValidatePayload = request => {
    return request.schema.shape.payload.parse(request.payload)
}

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
    const payload = parseAndValidatePayload(request)
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
        const res = runSyncFunctionChain(request.callback(txn))
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
