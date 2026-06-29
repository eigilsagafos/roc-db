import { BadRequestError } from "../errors/BadRequestError"
import { ChangeSetIntegrityError } from "../errors/ChangeSetIntegrityError"
import { SingletonDuplicationError } from "../errors/SingletonDuplicationError"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { Mutation } from "../types/Mutation"
import type { Ref } from "../types/Ref"
import { entityFromRef } from "../utils/entityFromRef"
import { generateRef } from "../utils/generateRef"
import { sortMutations } from "../utils/sortMutations"
import { defaultBeginTransaction } from "./defaultBeginTransaction"
import { loadMutations } from "./loadMutations"
import { persistOptimisticMutations } from "./persistOptimisticMutations"

// Millisecond ISO timestamp, matching how `generateMutationDoc` stamps real
// mutations. Entity/mutation schemas require `precision: 3`, so we must NOT use
// a higher-resolution clock here. Same-millisecond ties are resolved by the
// numeric id tiebreak in `sortMutations`, and the snowflake generates ids in
// call order, so dependency order is preserved regardless of clock resolution.
const isoNow = () => new Date().toISOString()

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

// Pure: turn the source mutations into clones bound to the target changeSet.
// No I/O — both the sync and async drivers share this.
const buildClones = (
    adapterOptions: AdapterOptions,
    sourceMutations: Mutation[],
    targetChangeSetRef: Ref,
    options: DuplicateChangeSetMutationsOptions,
) => {
    const sorted = sortMutations(sourceMutations)
    const kept = options.filter ? sorted.filter(options.filter) : sorted
    const keptSet = new Set(kept)

    // Step 3 — referential integrity. A ref created only by a dropped mutation
    // must not be referenced by a kept one (it would not exist on replay).
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

    // Step 4 — build the full refMap: a fresh ref of the same kind for every
    // entity created inside the (kept) changeSet.
    const refMap = new Map<Ref, Ref>()
    for (const mutation of kept) {
        for (const ref of createdRefsOf(mutation)) {
            if (refMap.has(ref)) continue
            const kind = entityFromRef(ref)
            if (adapterOptions.models?.[kind]?.singleton) {
                throw new SingletonDuplicationError(kind)
            }
            refMap.set(
                ref,
                generateRef(kind, adapterOptions.snowflake, isoNow()),
            )
        }
    }

    // Steps 5 + 6 — build clones with fresh mutation refs in dependency order.
    // Generating refs in order keeps numeric id order == dependency order, and
    // setting `timestamp` to the generation moment keeps timestamp order aligned
    // too, so `sortMutations` reproduces dependency order on either key.
    const sessionRef =
        adapterOptions.session.sessionRef ?? adapterOptions.session.ref ?? null
    const clones = kept.map((mutation: Mutation) => {
        const timestamp = isoNow()
        const ref = generateRef("Mutation", adapterOptions.snowflake, timestamp)
        const remappedPayload = remapValue(mutation.payload, refMap)
        const payload = options.transformPayload
            ? options.transformPayload(remappedPayload, refMap)
            : remappedPayload
        // Only the leading ref of each entry matters on replay (create entries
        // feed optimisticCreateRefs). The trailing reverse/document blob is
        // discarded and recomputed, so we leave it untouched.
        const log = (mutation.log ?? []).map((entry: any[]) => {
            const [entryRef, ...rest] = entry
            return [refMap.get(entryRef) ?? entryRef, ...rest]
        })
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
            identityRef: adapterOptions.session.identityRef,
            sessionRef,
            persistedAt: null,
        } as Mutation
    })

    const cloneRefs = new Set(clones.map((clone: Mutation) => clone.ref))
    return { clones, refMap, cloneRefs }
}

const readChangeSetMutations = (
    adapterOptions: AdapterOptions,
    engineOptions: any,
    changeSetRef: Ref,
) => {
    const beginTransaction =
        adapterOptions.functions.begin || defaultBeginTransaction
    return beginTransaction(engineOptions, (engineOptsTxn: any) =>
        adapterOptions.functions.getChangeSetMutations(
            { engineOpts: engineOptsTxn } as any,
            changeSetRef,
        ),
    )
}

const ingestClones = (
    adapterOptions: AdapterOptions,
    engineOptions: any,
    clones: Mutation[],
    operations: any[],
) =>
    adapterOptions.optimistic
        ? loadMutations(adapterOptions, engineOptions, clones, operations)
        : persistOptimisticMutations(
              adapterOptions,
              engineOptions,
              clones,
              operations,
          )

const duplicateChangeSetMutationsSync = (
    adapterOptions: AdapterOptions,
    engineOptions: any,
    sourceChangeSetRef: Ref,
    targetChangeSetRef: Ref,
    options: DuplicateChangeSetMutationsOptions,
    operations: any[],
): DuplicateChangeSetMutationsResult => {
    const sourceMutations = readChangeSetMutations(
        adapterOptions,
        engineOptions,
        sourceChangeSetRef,
    )
    const { clones, refMap, cloneRefs } = buildClones(
        adapterOptions,
        sourceMutations,
        targetChangeSetRef,
        options,
    )
    if (!clones.length) return { mutations: [], refMap }
    ingestClones(adapterOptions, engineOptions, clones, operations)
    const targetMutations = readChangeSetMutations(
        adapterOptions,
        engineOptions,
        targetChangeSetRef,
    )
    const mutations = sortMutations(
        targetMutations.filter((m: Mutation) => cloneRefs.has(m.ref)),
    )
    return { mutations, refMap }
}

const duplicateChangeSetMutationsAsync = async (
    adapterOptions: AdapterOptions,
    engineOptions: any,
    sourceChangeSetRef: Ref,
    targetChangeSetRef: Ref,
    options: DuplicateChangeSetMutationsOptions,
    operations: any[],
): Promise<DuplicateChangeSetMutationsResult> => {
    const sourceMutations = await readChangeSetMutations(
        adapterOptions,
        engineOptions,
        sourceChangeSetRef,
    )
    const { clones, refMap, cloneRefs } = buildClones(
        adapterOptions,
        sourceMutations,
        targetChangeSetRef,
        options,
    )
    if (!clones.length) return { mutations: [], refMap }
    await ingestClones(adapterOptions, engineOptions, clones, operations)
    const targetMutations = await readChangeSetMutations(
        adapterOptions,
        engineOptions,
        targetChangeSetRef,
    )
    const mutations = sortMutations(
        targetMutations.filter((m: Mutation) => cloneRefs.has(m.ref)),
    )
    return { mutations, refMap }
}

export const duplicateChangeSetMutations = (
    adapterOptions: AdapterOptions,
    engineOptions: any,
    sourceChangeSetRef: Ref,
    targetChangeSetRef: Ref,
    options: DuplicateChangeSetMutationsOptions = {},
    operations: any[],
) => {
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
    if (adapterOptions.async) {
        return duplicateChangeSetMutationsAsync(
            adapterOptions,
            engineOptions,
            sourceChangeSetRef,
            targetChangeSetRef,
            options,
            operations,
        )
    }
    return duplicateChangeSetMutationsSync(
        adapterOptions,
        engineOptions,
        sourceChangeSetRef,
        targetChangeSetRef,
        options,
        operations,
    )
}
