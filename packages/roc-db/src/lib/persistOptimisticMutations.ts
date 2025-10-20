import { BadRequestError } from "../errors/BadRequestError"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { Mutation } from "../types/Mutation"
import type { WriteOperation } from "../types/WriteOperation"
import { deepEqual } from "../utils/deepPatch"
import { defaultBeginRequest } from "./defaultBeginRequest"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { executeWriteRequestAsyncInternal } from "./executeWriteRequestAsync"
import { executeWriteRequestSyncInternal } from "./executeWriteRequestSync"
import { findOperation } from "./findOperation"
import { sortMutations } from "../utils/sortMutations"

const shouldSkipMutationImport = (mutation: Mutation, existing: Mutation) => {
    if (mutation.debounceCount > existing.debounceCount) return false
    if (existing.timestamp >= mutation.timestamp) return true
    return false
    // if (mutation.appliedAt && !existing.appliedAt) return
    // return true
}

const persistOptimisticMutationsSync = (
    adapterOptions: AdapterOptions,
    engineOptsTxn: any,
    groups: Record<string, Mutation[]>,
    operations: WriteOperation[],
) => {
    const persistedAt = new Date().toISOString()
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
            validatePayload(operation, mutation)
            const request = {
                operation,
                payload: mutation.payload,
                changeSetRef: mutation.changeSetRef,
                optimisticMutation: { ...mutation, persistedAt },
            }

            const [, persistedMutation] = beginRequest(
                request,
                engineOptsTxn,
                (engineOptsReq, txnCache) =>
                    executeWriteRequestSyncInternal(
                        request,
                        engineOptsReq,
                        adapterOptions,
                        mutation.payload,
                        txnCache,
                    ),
            )
            results.push(persistedMutation)
        }
    }

    return results
}

const validatePayload = (operation: WriteOperation, mutation: Mutation) => {
    const payloadParsed = operation.payloadSchema.safeParse(mutation.payload)
    if (!payloadParsed.success) {
        throw new BadRequestError("Payload validation failed")
    } else {
        if (!deepEqual(payloadParsed.data, mutation.payload)) {
            throw new BadRequestError("Payload validation failed")
        }
    }
}

const persistOptimisticMutationsAsync = async (
    adapterOptions: AdapterOptions,
    engineOptsTxn: any,
    groups: Record<string, Mutation[]>,
    operations: WriteOperation[],
) => {
    const persistedAt = new Date().toISOString()
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
            validatePayload(operation, mutation)
            const request = {
                operation,
                payload: mutation.payload,
                changeSetRef: mutation.changeSetRef,
                optimisticMutation: { ...mutation, persistedAt },
            }
            const [, persistedMutation] = await beginRequest(
                request,
                engineOptsTxn,
                (engineOptsReq, txnCache) =>
                    executeWriteRequestAsyncInternal(
                        request,
                        engineOptsReq,
                        adapterOptions,
                        mutation.payload,
                        txnCache,
                    ),
            )
            results.push(persistedMutation)
        }
    }

    return results
}

export const persistOptimisticMutations = (
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
            persistOptimisticMutationsAsync(
                adapterOptions,
                engineOptsTxn,
                groups,
                operations,
            ),
        )
    } else {
        return beginTransaction(engineOptions, engineOptsTxn =>
            persistOptimisticMutationsSync(
                adapterOptions,
                engineOptsTxn,
                groups,
                operations,
            ),
        )
    }
}
