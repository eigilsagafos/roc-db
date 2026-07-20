import { z } from "zod"
import type { Entity } from "./Entity"
import { assertChangeSetKind } from "./lib/assertChangeSetKind"
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
import type { ReplayDivergenceConfig } from "./types/ReplayDivergence"
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
    // Replay-divergence detection policy, read by lib/verifyReplayDivergence on
    // the replay/load path.
    replayDivergence?: ReplayDivergenceConfig
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
    const allOperations = [
        pageMutations,
        createPageEntitiesOperation(adapterOptions.entities),
        undo,
        redo,
        ...adapterOptions.operations,
    ]

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

    const operationsMap = Object.fromEntries(
        allOperations.map(
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
            return adapterOptions.operations.map(op => op.name)
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
