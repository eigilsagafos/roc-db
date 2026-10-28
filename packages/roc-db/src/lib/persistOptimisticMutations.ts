import { BadRequestError } from "../errors/BadRequestError"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { Mutation } from "../types/Mutation"
import type { WriteOperation } from "../types/WriteOperation"
import type { WriteRequest } from "../types/WriteRequest"
import { deepEqual } from "../utils/deepPatch"
import { rebaseDebouncedVersion, rebaseQuery } from "./debounce"
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

const after = (timestamp: string) =>
    new Date(Math.max(Date.now(), Date.parse(timestamp) + 1)).toISOString()

const persistOptimisticMutationsSync = (
    adapterOptions: AdapterOptions,
    engineOptsTxn: any,
    groups: Record<string, Mutation[]>,
    operations: WriteOperation[],
) => {
    let persistedAt = new Date().toISOString()
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
            const version =
                existing && mutation.debounceCount > existing.debounceCount
                    ? rebaseDebouncedVersion(
                          adapterOptions,
                          operation,
                          mutation,
                          existing,
                          adapterOptions.functions.findRecentMutations(
                              engineOptsTxn,
                              rebaseQuery(operation, mutation, existing),
                          ),
                      )
                    : mutation
            if (!version) {
                console.warn(
                    `Mutation ${mutation.ref} already synced, skipping`,
                )
                continue
            }
            // A batch shares one persistedAt and replay breaks ties by id, but
            // a rebased version's new id says nothing about its place in the
            // batch. Give it, and the mutations after it, later persistedAts.
            if (version.ref !== mutation.ref) persistedAt = after(persistedAt)
            const request: WriteRequest = {
                type: "write",
                operation,
                payload: version.payload,
                changeSetRef: version.changeSetRef ?? null,
                optimisticMutation: { ...version, persistedAt },
            }

            const [, persistedMutation] = beginRequest(
                request,
                engineOptsTxn,
                (engineOptsReq, txnCache) =>
                    executeWriteRequestSyncInternal(
                        request,
                        engineOptsReq,
                        adapterOptions,
                        version.payload,
                        txnCache,
                    ),
            )
            results.push(persistedMutation)
            if (version.ref !== mutation.ref) persistedAt = after(persistedAt)
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
    let persistedAt = new Date().toISOString()
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
            const version =
                existing && mutation.debounceCount > existing.debounceCount
                    ? rebaseDebouncedVersion(
                          adapterOptions,
                          operation,
                          mutation,
                          existing,
                          await adapterOptions.functions.findRecentMutations(
                              engineOptsTxn,
                              rebaseQuery(operation, mutation, existing),
                          ),
                      )
                    : mutation
            if (!version) {
                console.warn(
                    `Mutation ${mutation.ref} already synced, skipping`,
                )
                continue
            }
            // A batch shares one persistedAt and replay breaks ties by id, but
            // a rebased version's new id says nothing about its place in the
            // batch. Give it, and the mutations after it, later persistedAts.
            if (version.ref !== mutation.ref) persistedAt = after(persistedAt)
            const request: WriteRequest = {
                type: "write",
                operation,
                payload: version.payload,
                changeSetRef: version.changeSetRef ?? null,
                optimisticMutation: { ...version, persistedAt },
            }
            const [, persistedMutation] = await beginRequest(
                request,
                engineOptsTxn,
                (engineOptsReq, txnCache) =>
                    executeWriteRequestAsyncInternal(
                        request,
                        engineOptsReq,
                        adapterOptions,
                        version.payload,
                        txnCache,
                    ),
            )
            results.push(persistedMutation)
            if (version.ref !== mutation.ref) persistedAt = after(persistedAt)
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
    adapterOptions.functions.prepareChangeSets?.(
        engineOptions,
        Object.keys(groups).filter(key => key !== "root"),
    )

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
