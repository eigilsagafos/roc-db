import { z } from "zod"
import { execute } from "./lib/execute"
import { loadMutations } from "./lib/loadMutations"
import { persistOptimisticMutations } from "./lib/persistOptimisticMutations"
import { createPageEntitiesOperation } from "./operations/createPageEntitiesOperation"
import { pageMutations } from "./operations/pageMutations"
import { redo } from "./operations/redo"
import { undo } from "./operations/undo"
import type { AdapterFunctions } from "./types/AdapterFunctions"
import type { Mutation } from "./types/Mutation"
import type { Operation } from "./types/Operation"
import type { Ref } from "./types/Ref"
import { Snowflake } from "./utils/Snowflake"
import { generateRef } from "./utils/generateRef"

export type EntityN = z.ZodObject<{
    entity: z.ZodLiteral<string>
    // entity: z.string(),
    // payload: z.ZodTypeAny
}>

type AdapterOptions<
    Operations extends readonly Operation[] = [],
    Entities extends readonly EntityN[] = [],
    EngineOptions extends {} = {},
> = {
    name: string
    functions: AdapterFunctions<EngineOptions>
    operations: Operations
    entities: Entities
    changeSetRefs: Ref[]
    snowflake: Snowflake
    session: {
        identityRef: string
        sessionRef?: string
        [key: string]: any
    }
    async?: boolean
    changeSetRef?: Ref
    optimistic?: boolean
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
    adapterOptions.operations = allOperations
    adapterOptions.models = Object.fromEntries(
        adapterOptions.entities.map(model => [model.name, model]),
    )

    const operationsMap: FunctionMap = Object.fromEntries(
        allOperations.map(
            operation =>
                [
                    operation.name,
                    (payload: z.input<typeof operation.payloadSchema>) => {
                        const request = {
                            payload,
                            changeSetRef: adapterOptions.changeSetRef ?? null,
                            operation,
                        }
                        return execute(request, engineOptions, adapterOptions)
                    },
                ] as const,
        ),
    )

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
        get _entityKinds(): Entities[number]["shape"]["entity"]["value"] {
            return adapterOptions.entities.map(
                schema => schema.shape.entity.value,
            )
        },
        get _operationNames(): Operations[number]["operationName"] {
            return adapterOptions.operations.map(op => op.name)
        },
        get _operations() {
            return adapterOptions.operations
        },
        get _entites() {
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
            const { onChangeSetInit } = adapterOptions.functions
            return createAdapter(
                { ...adapterOptions, changeSetRef },
                onChangeSetInit
                    ? onChangeSetInit(engineOptions, changeSetRef)
                    : engineOptions,
            )
        },
        ...operationsMap,
    }
    if (adapterOptions.optimistic) {
        adapter.loadMutations = (mutations: Mutation[]) =>
            loadMutations(
                adapterOptions,
                engineOptions,
                mutations,
                allOperations,
            )
    } else {
        adapter.persistOptimisticMutations = (mutations: Mutation[]) =>
            persistOptimisticMutations(
                adapterOptions,
                engineOptions,
                mutations,
                allOperations,
            )
    }

    return adapter
}
