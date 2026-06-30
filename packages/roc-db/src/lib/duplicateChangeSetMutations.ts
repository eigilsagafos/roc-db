import { BadRequestError } from "../errors/BadRequestError"
import { ChangeSetIntegrityError } from "../errors/ChangeSetIntegrityError"
import { ChangeSetNotEmptyError } from "../errors/ChangeSetNotEmptyError"
import { NotFoundError } from "../errors/NotFoundError"
import { SingletonDuplicationError } from "../errors/SingletonDuplicationError"
import type { Mutation } from "../types/Mutation"
import type { Ref } from "../types/Ref"
import { deepEqual } from "../utils/deepPatch"
import { entityFromRef } from "../utils/entityFromRef"
import { generateRef } from "../utils/generateRef"
import { sortMutations } from "../utils/sortMutations"
import { findOperation } from "./findOperation"
import { generateTransactionCache } from "./generateTransactionCache"
import { loadChangeSetBase } from "./loadChangeSetBase"
import { parseRequestPayload } from "./parseRequestPayload"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { runSyncFunctionChain } from "./runSyncFunctionChain"
import { WriteTransaction } from "./WriteTransaction"

export type DuplicateChangeSetMutationsOptions = {
    filter?: (mutation: Mutation) => boolean
    transformPayload?: (payload: unknown, refMap: Map<Ref, Ref>) => unknown
}

export type DuplicateChangeSetMutationsResult = {
    mutations: Mutation[]
    refMap: Map<Ref, Ref>
}

// Refs created by a mutation, read off its persisted log create-entries.
const createdRefsOf = (mutation: Mutation): Ref[] =>
    (mutation.log ?? [])
        .filter((entry: any[]) => entry[1] === "create")
        .map((entry: any[]) => entry[0])

// Deep-clone a value while replacing any string that is a key in `map` with its
// mapped value. Used for the operation payload — standalone string refs only;
// refs embedded inside larger strings are the caller's job (transformPayload).
const remapValue = (value: any, map: Map<Ref, Ref>): any => {
    if (typeof value === "string") {
        return map.has(value) ? map.get(value) : value
    }
    if (Array.isArray(value)) {
        return value.map(item => remapValue(item, map))
    }
    if (value && typeof value === "object") {
        const out: Record<string, any> = {}
        for (const key in value) {
            out[key] = remapValue(value[key], map)
        }
        return out
    }
    return value
}

// Collect every string in a value into `into` (over-broad on purpose; callers
// intersect with a known ref set).
const collectStrings = (value: any, into: Set<string>) => {
    if (typeof value === "string") {
        into.add(value)
    } else if (Array.isArray(value)) {
        for (const item of value) collectStrings(item, into)
    } else if (value && typeof value === "object") {
        for (const key in value) collectStrings(value[key], into)
    }
}

type ClonePlan = {
    operation: any
    // The replay request + the not-yet-finalized clone record. Replaying the
    // operation against the scratch cache derives the real (consistent) log.
    request: { type: "write"; operation: any; payload: any; changeSetRef: Ref }
    skeleton: Mutation
    // Remapped create-entries; feed createRef so the operation re-mints the new
    // entity refs (in createRef order) during replay.
    pinningLog: [Ref, "create"][]
}

// Pure: turn the source mutations into clone *plans* with fresh refs and
// remapped/transformed payloads. The log is NOT copied — it's recomputed by
// replaying each operation (see below), so it's always consistent with the
// (possibly transformed) payload.
const buildClonePlans = (
    txn: WriteTransaction,
    sourceMutations: Mutation[],
    targetChangeSetRef: Ref,
    options: DuplicateChangeSetMutationsOptions,
): { plans: ClonePlan[]; refMap: Map<Ref, Ref> } => {
    const { adapter } = txn
    const timestamp = txn.timestamp
    const sorted = sortMutations(sourceMutations)
    const kept = options.filter ? sorted.filter(options.filter) : sorted
    const keptSet = new Set(kept)

    // Referential integrity: a ref created only by a dropped mutation must not
    // be referenced by a kept one (replay would hit a non-existent entity).
    const keptCreated = new Set<Ref>()
    for (const mutation of kept) {
        for (const ref of createdRefsOf(mutation)) keptCreated.add(ref)
    }
    const droppedCreated = new Set<Ref>()
    for (const mutation of sorted) {
        if (keptSet.has(mutation)) continue
        for (const ref of createdRefsOf(mutation)) {
            if (!keptCreated.has(ref)) droppedCreated.add(ref)
        }
    }
    if (droppedCreated.size) {
        for (const mutation of kept) {
            const referenced = new Set<string>()
            collectStrings(mutation.payload, referenced)
            for (const entry of mutation.log ?? []) referenced.add(entry[0])
            for (const ref of referenced) {
                if (droppedCreated.has(ref)) {
                    throw new ChangeSetIntegrityError(ref, mutation.ref)
                }
            }
        }
    }

    // `refMap` maps source entity refs -> new entity refs (returned to callers).
    // `remap` also maps source mutation refs -> new mutation refs; it's used for
    // the payload remap so undo/redo payloads (which are mutation refs) point at
    // the copies. Fresh refs are minted under the transaction timestamp, exactly
    // like a normal write's createRef calls.
    const refMap = new Map<Ref, Ref>()
    const remap = new Map<Ref, Ref>()
    const sessionRef = adapter.session.sessionRef ?? adapter.session.ref ?? null
    const plans = kept.map((mutation: Mutation): ClonePlan => {
        for (const oldRef of createdRefsOf(mutation)) {
            if (refMap.has(oldRef)) continue
            const kind = entityFromRef(oldRef)
            if (adapter.models?.[kind]?.singleton) {
                throw new SingletonDuplicationError(kind)
            }
            const newRef = generateRef(kind, adapter.snowflake, timestamp)
            refMap.set(oldRef, newRef)
            remap.set(oldRef, newRef)
        }
        const ref = generateRef("Mutation", adapter.snowflake, timestamp)
        remap.set(mutation.ref, ref)
        const remappedPayload = remapValue(mutation.payload, remap)
        let payload = remappedPayload
        const operation = findOperation(adapter.operations, mutation)
        if (options.transformPayload) {
            // The generic remap only swaps standalone refs; transformPayload is
            // arbitrary, so validate its output against the operation schema (a
            // bad transform would otherwise blow up mid-replay). The hook gets
            // the entity refMap, matching its documented contract.
            payload = options.transformPayload(remappedPayload, refMap)
            const parsed = operation.payloadSchema.safeParse(payload)
            if (!parsed.success || !deepEqual(parsed.data, payload)) {
                throw new BadRequestError(
                    `transformPayload produced an invalid payload for operation '${mutation.operation.name}'`,
                )
            }
        }
        const pinningLog = createdRefsOf(mutation).map(
            (oldRef): [Ref, "create"] => [refMap.get(oldRef)!, "create"],
        )
        const request = {
            type: "write" as const,
            operation,
            payload,
            changeSetRef: targetChangeSetRef,
        }
        const skeleton = {
            ref,
            timestamp,
            operation: {
                name: mutation.operation.name,
                version: mutation.operation.version,
            },
            payload,
            log: pinningLog,
            changeSetRef: targetChangeSetRef,
            debounceCount: 0,
            identityRef: adapter.session.identityRef,
            sessionRef,
            persistedAt: adapter.optimistic ? null : timestamp,
        } as Mutation
        return { operation, request, skeleton, pinningLog }
    })

    return { plans, refMap }
}

// Replay one plan against the shared scratch cache: run the operation (which
// reads accumulated state + mints the pinned refs), then finalize — deriving a
// log that is always consistent with the payload — and persist the record.
const replayPlanSync = (
    txn: WriteTransaction,
    plan: ClonePlan,
    cache: any,
): Mutation => {
    const payload = parseRequestPayload(plan.request)
    const replayTxn = new WriteTransaction(
        plan.request as any,
        txn.engineOpts,
        txn.adapter,
        payload,
        plan.skeleton,
        plan.pinningLog as any,
        cache,
    )
    runSyncFunctionChain(
        plan.operation.callback(replayTxn, txn.adapter.session),
    )
    const record = replayTxn.finalizedMutation(false)
    txn.adapter.functions.saveMutation(replayTxn, record)
    return record
}

const replayPlanAsync = async (
    txn: WriteTransaction,
    plan: ClonePlan,
    cache: any,
): Promise<Mutation> => {
    const payload = parseRequestPayload(plan.request)
    const replayTxn = new WriteTransaction(
        plan.request as any,
        txn.engineOpts,
        txn.adapter,
        payload,
        plan.skeleton,
        plan.pinningLog as any,
        cache,
    )
    await runAsyncFunctionChain(
        plan.operation.callback(replayTxn, txn.adapter.session),
    )
    const record = replayTxn.finalizedMutation(false)
    await txn.adapter.functions.saveMutation(replayTxn, record)
    return record
}

const validateRefs = (sourceChangeSetRef: Ref, targetChangeSetRef: Ref) => {
    if (!sourceChangeSetRef) {
        throw new BadRequestError("sourceChangeSetRef is required")
    }
    if (!targetChangeSetRef) {
        throw new BadRequestError("targetChangeSetRef is required")
    }
    if (sourceChangeSetRef === targetChangeSetRef) {
        throw new BadRequestError(
            "sourceChangeSetRef and targetChangeSetRef must differ",
        )
    }
}

// Seed the scratch cache with the SOURCE changeSet's base (its version
// snapshot), via the shared loadChangeSetBase so duplication resolves the base
// exactly as initializeChangeSet does. We seed from the source (committed) —
// never the target — so duplicating works even when the target changeSet was
// created earlier in this same, not-yet-committed transaction.
const seedBaseSync = (
    txn: WriteTransaction,
    sourceChangeSetRef: Ref,
    cache: any,
) => {
    const sourceDoc = txn.readEntity(sourceChangeSetRef, false)
    if (!sourceDoc) throw new NotFoundError(sourceChangeSetRef)
    loadChangeSetBase(txn as any, sourceDoc, cache)
}

const seedBaseAsync = async (
    txn: WriteTransaction,
    sourceChangeSetRef: Ref,
    cache: any,
) => {
    const sourceDoc = await txn.readEntity(sourceChangeSetRef, false)
    if (!sourceDoc) throw new NotFoundError(sourceChangeSetRef)
    await loadChangeSetBase(txn as any, sourceDoc, cache)
}

const duplicateSync = (
    txn: WriteTransaction,
    sourceChangeSetRef: Ref,
    targetChangeSetRef: Ref,
    options: DuplicateChangeSetMutationsOptions,
): DuplicateChangeSetMutationsResult => {
    const cache = generateTransactionCache(true)
    seedBaseSync(txn, sourceChangeSetRef, cache)
    const existing = txn.adapter.functions.getChangeSetMutations(
        txn,
        targetChangeSetRef,
    )
    if (existing.length) {
        throw new ChangeSetNotEmptyError(targetChangeSetRef, existing.length)
    }
    const sourceMutations = txn.adapter.functions.getChangeSetMutations(
        txn,
        sourceChangeSetRef,
    )
    const { plans, refMap } = buildClonePlans(
        txn,
        sourceMutations,
        targetChangeSetRef,
        options,
    )
    const mutations = plans.map(plan => replayPlanSync(txn, plan, cache))
    return { mutations, refMap }
}

const duplicateAsync = async (
    txn: WriteTransaction,
    sourceChangeSetRef: Ref,
    targetChangeSetRef: Ref,
    options: DuplicateChangeSetMutationsOptions,
): Promise<DuplicateChangeSetMutationsResult> => {
    const cache = generateTransactionCache(true)
    await seedBaseAsync(txn, sourceChangeSetRef, cache)
    const existing = await txn.adapter.functions.getChangeSetMutations(
        txn,
        targetChangeSetRef,
    )
    if (existing.length) {
        throw new ChangeSetNotEmptyError(targetChangeSetRef, existing.length)
    }
    const sourceMutations = await txn.adapter.functions.getChangeSetMutations(
        txn,
        sourceChangeSetRef,
    )
    const { plans, refMap } = buildClonePlans(
        txn,
        sourceMutations,
        targetChangeSetRef,
        options,
    )
    const mutations: Mutation[] = []
    for (const plan of plans) {
        mutations.push(await replayPlanAsync(txn, plan, cache))
    }
    return { mutations, refMap }
}

/**
 * Copy a changeSet's pending mutations into another changeSet with fresh entity
 * refs, so the source and the copy can both be applied later without
 * primary-key collisions. A transaction primitive (like `applyChangeSet`):
 * consumers call it from inside their own write operation, after creating the
 * target changeSet's root entity, so the whole duplicate is one transaction.
 *
 * Each mutation is re-played: its operation is re-run (with the remapped /
 * transformed payload, pinning fresh refs) against a scratch cache seeded from
 * the source's base, and `finalizeMutation` derives the stored log. So the log
 * is always consistent with the payload — `transformPayload` rewriting refs
 * inside strings is reflected in reverse/delete blobs too.
 */
export const duplicateChangeSetMutations = (
    txn: WriteTransaction,
    sourceChangeSetRef: Ref,
    targetChangeSetRef: Ref,
    options: DuplicateChangeSetMutationsOptions = {},
) => {
    validateRefs(sourceChangeSetRef, targetChangeSetRef)
    if (txn.adapter.async) {
        return duplicateAsync(
            txn,
            sourceChangeSetRef,
            targetChangeSetRef,
            options,
        )
    }
    return duplicateSync(txn, sourceChangeSetRef, targetChangeSetRef, options)
}
