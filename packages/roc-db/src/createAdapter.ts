import { z } from "zod"
import type { Entity } from "./Entity"
import { assertChangeSetKind } from "./lib/assertChangeSetKind"
import { assertUniqueOperations } from "./lib/assertUniqueOperations"
import { execute } from "./lib/execute"
import { validateChangeSetVersionParents } from "./lib/validateChangeSetVersionParents"
import { loadMutations } from "./lib/loadMutations"
import { persistOptimisticMutations } from "./lib/persistOptimisticMutations"
import { createPageEntitiesOperation } from "./operations/createPageEntitiesOperation"
import { pageMutations } from "./operations/pageMutations"
import { redo } from "./operations/redo"
import { undo } from "./operations/undo"
import type { AdapterOptions as EngineAdapterOptions } from "./types/AdapterOptions"
import type { AdapterFunctions } from "./types/AdapterFunctions"
import type { Mutation } from "./types/Mutation"
import type { Operation } from "./types/Operation"
import type { Ref } from "./types/Ref"
import type { RocDBRequest } from "./types/RocDBRequest"
import { Snowflake } from "./utils/Snowflake"
import { generateRef } from "./utils/generateRef"

// An entity model: an instance of the `Entity` builder class (adapters pass
// `new Entity("Post", {...})` instances). This was previously mistyped as a
// bare zod object, so real usage (e.g. `model.name` below) never type-checked
// and `Entity` instances weren't assignable to the `entities` param.
export type EntityN = Entity<any>

type AdapterOptions<
    Operations extends readonly Operation[] = [],
    Entities extends readonly EntityN[] = [],
    EngineOptions extends {} = {},
> = {
    name: string
    functions: AdapterFunctions<EngineOptions>
    operations: Operations
    entities: Entities
    changeSetRefs?: Ref[]
    snowflake: Snowflake
    session: {
        identityRef: string
        sessionRef?: string
        [key: string]: any
    }
    async?: boolean
    changeSetRef?: Ref
    optimistic?: boolean
    // Optional per-operation validation hooks, invoked from lib/commit.
    validateCreate?: (txn: any, document: any) => void
    validateUpdate?: (txn: any, document: any, originalDocument: any) => void
    validateDelete?: (txn: any, document: any) => void
    // Populated by createAdapter at construction time (undo/redo stacks and the
    // name->model lookup); not supplied by callers.
    undoStack?: Mutation[]
    redoStack?: Mutation[]
    models?: Record<string, EntityN>
}
export const createAdapter = <
    const Operations extends readonly Operation[],
    const Entities extends readonly EntityN[],
    const EngineOptions extends {} = {},
>(
    adapterOptions: AdapterOptions<Operations, Entities, EngineOptions>,
    engineOptions: EngineOptions = {} as EngineOptions,
) => {
    // Built-ins are prepended on every construction. clone()/changeSet() re-run
    // createAdapter with an operations list that ALREADY includes them (it was
    // stored back onto adapterOptions below), so strip built-in-named entries
    // from the incoming list first — otherwise they'd double on each re-entry.
    const builtInOperations = [
        pageMutations,
        createPageEntitiesOperation(adapterOptions.entities),
        undo,
        redo,
    ]
    const builtInNames = new Set<string>(builtInOperations.map(op => op.name))
    const userOperations = adapterOptions.operations.filter(
        op => !builtInNames.has(op.name),
    )
    // A given (name, version) may only be registered once. Multiple *versions*
    // (same name, different version) are allowed and expected; a repeated
    // (name, version) is an accidental double-registration and throws.
    assertUniqueOperations(userOperations)
    const allOperations = [...builtInOperations, ...userOperations]

    type FunctionMap = {
        [Item in (typeof allOperations)[number] as Item["name"]]: (
            payload: z.input<Item["payloadSchema"]>,
        ) => z.output<Item["payloadSchema"]>
    }
    adapterOptions.undoStack = []
    adapterOptions.redoStack = []

    // const operations = [...adapterOptions.operations, undo, redo]
    // allOperations mixes the caller's operations with the built-ins
    // (pageMutations/pageEntities/undo/redo), so it's wider than the narrow
    // `Operations` generic; the runtime deliberately stores the augmented list.
    adapterOptions.operations = allOperations as unknown as Operations
    adapterOptions.models = Object.fromEntries(
        adapterOptions.entities.map(model => [model.name, model]),
    )
    validateChangeSetVersionParents(adapterOptions)

    // An operation can be registered at multiple versions (same name, different
    // `version`). The public adapter method always invokes the highest version
    // so new writes use the latest logic; replay stays version-pinned via
    // findOperation. Selecting by max version keeps this independent of the
    // order operations were passed in.
    const latestOperationByName = new Map<
        string,
        (typeof allOperations)[number]
    >()
    for (const operation of allOperations) {
        const existing = latestOperationByName.get(operation.name)
        const version = (operation as { version?: number }).version ?? 1
        const existingVersion =
            (existing as { version?: number } | undefined)?.version ?? 1
        if (!existing || version > existingVersion) {
            latestOperationByName.set(operation.name, operation)
        }
    }

    const operationsMap = Object.fromEntries(
        [...latestOperationByName.values()].map(
            operation =>
                [
                    operation.name,
                    (payload: z.input<typeof operation.payloadSchema>) => {
                        const request = {
                            type: operation.type,
                            payload,
                            changeSetRef: adapterOptions.changeSetRef ?? null,
                            operation,
                        }
                        // `type` and the `operation` union aren't correlated for
                        // TS's discriminated-union check; the shape is valid.
                        return execute(
                            request as RocDBRequest,
                            engineOptions,
                            adapterOptions as unknown as EngineAdapterOptions,
                        )
                    },
                ] as const,
        ),
    ) as FunctionMap

    const adapter = {
        get _name() {
            return adapterOptions.name
        },
        get _engineOpts() {
            return engineOptions
        },
        get _adapterOpts() {
            return adapterOptions
        },
        get _entityKinds(): Entities[number]["name"][] {
            return adapterOptions.entities.map(model => model.name)
        },
        get _operationNames(): Operations[number]["name"][] {
            // De-dupe so an operation registered at multiple versions surfaces
            // once (adapterOptions.operations holds every version).
            return [
                ...new Set(adapterOptions.operations.map(op => op.name)),
            ] as Operations[number]["name"][]
        },
        get _operations() {
            return adapterOptions.operations
        },
        get _entities() {
            return adapterOptions.entities
        },
        clone: (overrides: Partial<EngineOptions> = {}) => {
            return createAdapter(adapterOptions, {
                ...engineOptions,
                ...overrides,
            })
        },
        generateRef: (entity: string) =>
            generateRef(
                entity,
                adapterOptions.snowflake,
                new Date().toISOString(),
            ),
        changeSet: (changeSetRef: Ref) => {
            assertChangeSetKind(adapterOptions, changeSetRef)
            const { onChangeSetInit } = adapterOptions.functions
            return createAdapter(
                { ...adapterOptions, changeSetRef },
                onChangeSetInit
                    ? onChangeSetInit(
                          engineOptions,
                          adapterOptions,
                          changeSetRef,
                      )
                    : engineOptions,
            )
        },
        ...operationsMap,
    }
    // loadMutations / persistOptimisticMutations are attached conditionally on
    // top of the operation map, so they aren't part of the inferred literal.
    const mutable = adapter as typeof adapter & {
        loadMutations?: (mutations: Mutation[]) => unknown
        persistOptimisticMutations?: (mutations: Mutation[]) => unknown
    }
    // These lib fns take the looser engine-facing AdapterOptions (async required);
    // the local options type has async optional, so bridge with a cast.
    const engineAdapterOptions =
        adapterOptions as unknown as EngineAdapterOptions
    if (adapterOptions.optimistic) {
        mutable.loadMutations = (mutations: Mutation[]) =>
            loadMutations(
                engineAdapterOptions,
                engineOptions,
                mutations,
                allOperations,
            )
    } else {
        mutable.persistOptimisticMutations = (mutations: Mutation[]) =>
            persistOptimisticMutations(
                engineAdapterOptions,
                engineOptions,
                mutations,
                allOperations,
            )
    }

    return adapter
}
