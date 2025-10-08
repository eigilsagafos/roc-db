import type { AdapterOptions } from "../types/AdapterOptions"
import type { Mutation } from "../types/Mutation"
import type { WriteOperation } from "../types/WriteOperation"
import { defaultBeginRequest } from "./defaultBeginRequest"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { executeWriteRequestAsyncInternal } from "./executeWriteRequestAsync"
import { executeWriteRequestSyncInternal } from "./executeWriteRequestSync"
import { findOperation } from "./findOperation"
import { sortMutations } from "./sortMutations"

const shouldSkipMutationImport = (mutation: Mutation, existing: Mutation) => {
    if (mutation.debounceCount > existing.debounceCount) return false
    if (existing.timestamp >= mutation.timestamp) return true
    return false
    // if (mutation.appliedAt && !existing.appliedAt) return
    // return true
}

const loadMutationsSync = (
    adapterOptions: AdapterOptions,
    engineOptsTxn: any,
    groups: Record<string, Mutation[]>,
    operations: WriteOperation[],
) => {
    const results = []
    const beginRequest =
        adapterOptions.functions.beginRequest || defaultBeginRequest

    // The txnMap was implemented as a quick fix to speed up loadMutations with the valdres adapter.
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
            const request = {
                operation,
                payload: mutation.payload,
                changeSetRef: mutation.changeSetRef,
                optimisticMutation: mutation,
                isBatch: true,
            }

            const result = beginRequest(
                request,
                engineOptsTxn,
                (engineOptsReq, scopedTxn) => {
                    return executeWriteRequestSyncInternal(
                        request,
                        engineOptsReq,
                        adapterOptions,
                        mutation.payload,
                        scopedTxn,
                    )
                },
            )
            results.push(result)
        }
    }

    return results
}

const loadMutationsAsync = async (
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
            const request = {
                operation,
                payload: mutation.payload,
                changeSetRef: mutation.changeSetRef,
                optimisticMutation: mutation,
                isBatch: true,
            }
            const result = await beginRequest(
                request,
                engineOptsTxn,
                (engineOptsReq, cacheMap) =>
                    executeWriteRequestAsyncInternal(
                        request,
                        engineOptsReq,
                        adapterOptions,
                        mutation.payload,
                        cacheMap,
                    ),
            )
            results.push(result)
        }
    }

    return results
}

export const loadMutations = (
    adapterOptions: AdapterOptions,
    engineOptions: any,
    mutations: Mutation[],
    operations: any[],
) => {
    const sorted = sortMutations(mutations)
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
            loadMutationsAsync(
                adapterOptions,
                engineOptsTxn,
                groups,
                operations,
            ),
        )
    } else {
        return beginTransaction(engineOptions, engineOptsTxn =>
            loadMutationsSync(
                adapterOptions,
                engineOptsTxn,
                groups,
                operations,
            ),
        )
    }
}
