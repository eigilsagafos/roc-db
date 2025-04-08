import type { AdapterOptions } from "../types/AdapterOptions"
import type { Mutation } from "../types/Mutation"
import type { WriteOperation } from "../types/WriteOperation"
import { defaultBeginRequest } from "./defaultBeginRequest"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { executeWriteRequestAsyncInternal } from "./executeWriteRequestAsync"
import { executeWriteRequestSyncInternal } from "./executeWriteRequestSync"
import { findOperation } from "./findOperation"

const shouldSkipMutationImport = (mutation: Mutation, existing: Mutation) => {
    if (mutation.debounceCount > existing.debounceCount) return false
    if (existing.timestamp >= mutation.timestamp) return true
    return false
    // if (mutation.appliedAt && !existing.appliedAt) return
    // return true
}

const loadOptimisticMutationsSync = (
    adapterOptions: AdapterOptions,
    engineOptsTxn: any,
    groups: Record<string, Mutation[]>,
    operations: WriteOperation[],
) => {
    const results = []
    const beginRequest =
        adapterOptions.functions.beginRequest || defaultBeginRequest
    for (const groupKey in groups) {
        const mutations = groups[groupKey]
        for (const mutation of mutations) {
            const existing = adapterOptions.functions.readMutation(
                engineOptsTxn,
                mutation.ref,
            )
            if (existing) {
                if (shouldSkipMutationImport(mutation, existing)) {
                    console.warn(
                        `Mutation ${mutation.ref} already exists, skipping`,
                    )
                    continue
                }
            }
            const operation = findOperation(operations, mutation)
            const request = operation(
                mutation.payload,
                mutation.changeSetRef,
                mutation,
            )
            const result = beginRequest(request, engineOptsTxn, engineOptsReq =>
                executeWriteRequestSyncInternal(
                    request,
                    engineOptsReq,
                    adapterOptions,
                    mutation.payload,
                ),
            )
            results.push(result)
        }
    }
    const endTransaction = adapterOptions.functions.end
    if (endTransaction) {
        endTransaction(engineOptsTxn)
    }
    return results
}

const loadOptimisticMutationsAsync = async (
    adapterOptions: AdapterOptions,
    engineOptsTxn: any,
    groups: Record<string, Mutation[]>,
    operations: WriteOperation[],
) => {
    const results = []
    const beginRequest =
        adapterOptions.functions.beginRequest || defaultBeginRequest

    for (const groupKey in groups) {
        const mutations = groups[groupKey]
        for (const mutation of mutations) {
            const existing = await adapterOptions.functions.readMutation(
                engineOptsTxn,
                mutation.ref,
            )
            if (existing) {
                if (shouldSkipMutationImport(mutation, existing)) {
                    console.warn(
                        `Mutation ${mutation.ref} already exists, skipping`,
                    )
                    continue
                }
            }
            const operation = findOperation(operations, mutation)
            const request = operation(
                mutation.payload,
                mutation.changeSetRef,
                mutation,
            )
            const result = await beginRequest(
                request,
                engineOptsTxn,
                engineOptsReq =>
                    executeWriteRequestAsyncInternal(
                        request,
                        engineOptsReq,
                        adapterOptions,
                        mutation.payload,
                    ),
            )
            results.push(result)
        }
    }
    const endTransaction = adapterOptions.functions.end
    if (endTransaction) {
        await endTransaction(engineOptsTxn)
    }
    return results
}

export const loadOptimisticMutations = (
    adapterOptions: AdapterOptions,
    engineOptions: any,
    mutations: Mutation[],
    operations: any[],
) => {
    const sorted = mutations.sort((a, b) => (a.ref > b.ref ? 1 : -1))
    const groups = sorted.reduce(
        (acc, mutation) => {
            const key = mutation.changeSetRef ?? "root"
            if (!acc[key]) {
                acc[key] = []
            }
            acc[key].push(mutation)
            return acc
        },
        {} as Record<string, Mutation[]>,
    )
    const beginTransaction =
        adapterOptions.functions.begin || defaultBeginTransaction

    if (adapterOptions.async) {
        return beginTransaction(engineOptions, engineOptsTxn =>
            loadOptimisticMutationsAsync(
                adapterOptions,
                engineOptsTxn,
                groups,
                operations,
            ),
        )
    } else {
        return beginTransaction(engineOptions, engineOptsTxn =>
            loadOptimisticMutationsSync(
                adapterOptions,
                engineOptsTxn,
                groups,
                operations,
            ),
        )
    }
}
