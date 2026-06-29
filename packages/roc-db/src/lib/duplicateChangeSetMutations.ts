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
import type { WriteTransaction } from "./WriteTransaction"

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

// Deep-clone a value while replacing any string that is a key in `refMap` with
// its remapped ref. Only standalone string *values* are remapped — object keys
// and refs embedded inside larger strings are left to `transformPayload`.
const remapValue = (value: any, refMap: Map<Ref, Ref>): any => {
    if (typeof value === "string") {
        return refMap.has(value) ? refMap.get(value) : value
    }
    if (Array.isArray(value)) {
        return value.map(item => remapValue(item, refMap))
    }
    if (value && typeof value === "object") {
        const out: Record<string, any> = {}
        for (const key in value) {
            out[key] = remapValue(value[key], refMap)
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

// Pure: turn the source mutations into copied *records* bound to the target
// changeSet. No replay, no entity materialization — mutations live in root and
// only enter scope state when something later runs/loads them, so duplicating
// is record-copying. `timestamp` is the current transaction's timestamp; like a
// normal write's createRef calls, every fresh ref is minted under it.
const buildCopies = (
    txn: WriteTransaction,
    sourceMutations: Mutation[],
    targetChangeSetRef: Ref,
    options: DuplicateChangeSetMutationsOptions,
) => {
    const { adapter } = txn
    const timestamp = txn.timestamp
    const sorted = sortMutations(sourceMutations)
    const kept = options.filter ? sorted.filter(options.filter) : sorted
    const keptSet = new Set(kept)

    // Referential integrity: a ref created only by a dropped mutation must not
    // be referenced by a kept one (it would not exist when the copy is run).
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

    // One pass in dependency order. Each copy gets a fresh mutation ref, and the
    // entities it creates get fresh refs of the same kind — all minted under the
    // transaction timestamp. Generating in order keeps numeric id order ==
    // dependency order, so a later run/load replays them correctly. `appliedAt`
    // is dropped: the copy starts unapplied even when the source was applied.
    // `refMap` maps source entity refs -> new entity refs (returned to callers).
    // `remap` additionally maps source mutation refs -> new mutation refs; it's
    // used for the deep remap of payloads and logs so that everything a copied
    // record points at — entity refs in relations, refs inside reverse/delete
    // blobs, and mutation refs (undo/redo payloads, created/updated provenance)
    // — refers to the copy, never the source.
    const refMap = new Map<Ref, Ref>()
    const remap = new Map<Ref, Ref>()
    const sessionRef = adapter.session.sessionRef ?? adapter.session.ref ?? null
    const mutations = kept.map((mutation: Mutation) => {
        // Mint fresh refs for entities this mutation creates, and a fresh
        // mutation ref, *before* remapping — so a payload/log referencing its
        // own created entity or its own mutation ref is covered. Earlier
        // mutations' refs are already mapped; base refs are absent and stay.
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
        if (options.transformPayload) {
            // The generic remap only swaps refs for same-kind refs, so it stays
            // valid; transformPayload is arbitrary, so validate its output
            // against the operation schema (it would otherwise persist silently
            // and only surface on a later run/load). The hook gets the entity
            // refMap, matching its documented contract.
            payload = options.transformPayload(remappedPayload, refMap)
            const operation = findOperation(adapter.operations, mutation)
            const parsed = operation.payloadSchema.safeParse(payload)
            if (!parsed.success || !deepEqual(parsed.data, payload)) {
                throw new BadRequestError(
                    `transformPayload produced an invalid payload for operation '${mutation.operation.name}'`,
                )
            }
        }
        // Deep-remap each log entry: the leading ref (create entries pin the new
        // refs on run/load) AND the trailing reverse-patch / deleted-document
        // blob, whose refs undo/redo would otherwise write back as source refs.
        // remapValue also deep-clones, so the copy shares nothing with source.
        const log = (mutation.log ?? []).map((entry: any[]) =>
            remapValue(entry, remap),
        )
        return {
            ref,
            timestamp,
            operation: {
                name: mutation.operation.name,
                version: mutation.operation.version,
            },
            payload,
            log,
            changeSetRef: targetChangeSetRef,
            debounceCount: 0,
            identityRef: adapter.session.identityRef,
            sessionRef,
            persistedAt: adapter.optimistic ? null : timestamp,
        } as Mutation
    })

    return { mutations, refMap }
}

// Persist one copied record. Mutations always live in root, so we go straight
// to the adapter's saveMutation (no replay / no entity writes). saveMutation
// stores the mutation it is handed (keyed by that mutation's ref), so we pass
// the current transaction plus the copy — no synthetic txn context needed.
const saveCopy = (txn: WriteTransaction, copy: Mutation) =>
    txn.adapter.functions.saveMutation(txn, copy)

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

const duplicateSync = (
    txn: WriteTransaction,
    sourceChangeSetRef: Ref,
    targetChangeSetRef: Ref,
    options: DuplicateChangeSetMutationsOptions,
): DuplicateChangeSetMutationsResult => {
    if (!txn.adapter.functions.readEntity(txn, sourceChangeSetRef)) {
        throw new NotFoundError(sourceChangeSetRef)
    }
    const existing = txn.adapter.functions.getChangeSetMutations(
        txn,
        targetChangeSetRef,
    )
    if (existing.length) {
        throw new ChangeSetNotEmptyError(targetChangeSetRef, existing.length)
    }
    const source = txn.adapter.functions.getChangeSetMutations(
        txn,
        sourceChangeSetRef,
    )
    const { mutations, refMap } = buildCopies(
        txn,
        source,
        targetChangeSetRef,
        options,
    )
    for (const copy of mutations) saveCopy(txn, copy)
    return { mutations, refMap }
}

const duplicateAsync = async (
    txn: WriteTransaction,
    sourceChangeSetRef: Ref,
    targetChangeSetRef: Ref,
    options: DuplicateChangeSetMutationsOptions,
): Promise<DuplicateChangeSetMutationsResult> => {
    if (!(await txn.adapter.functions.readEntity(txn, sourceChangeSetRef))) {
        throw new NotFoundError(sourceChangeSetRef)
    }
    const existing = await txn.adapter.functions.getChangeSetMutations(
        txn,
        targetChangeSetRef,
    )
    if (existing.length) {
        throw new ChangeSetNotEmptyError(targetChangeSetRef, existing.length)
    }
    const source = await txn.adapter.functions.getChangeSetMutations(
        txn,
        sourceChangeSetRef,
    )
    const { mutations, refMap } = buildCopies(
        txn,
        source,
        targetChangeSetRef,
        options,
    )
    // Persist concurrently — porsager/postgres pipelines these on the txn
    // connection, collapsing N sequential round-trips. Save order is irrelevant
    // (records are keyed by ref and reordered by sortMutations on read).
    await Promise.all(mutations.map((copy: Mutation) => saveCopy(txn, copy)))
    return { mutations, refMap }
}

/**
 * Copy a changeSet's pending mutations into another changeSet with fresh entity
 * refs, so the source and the copy can both be run/applied later without
 * primary-key collisions. A transaction primitive (like `applyChangeSet`):
 * consumers call it from inside their own write operation, after creating the
 * target changeSet's root entity, so the whole duplicate is one transaction.
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
