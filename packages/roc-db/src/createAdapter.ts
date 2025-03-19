import { z } from "zod"
import { execute } from "./lib/execute"
import { createPageEntitiesOperation } from "./operations/createPageEntitiesOperation"
import { pageMutations } from "./operations/pageMutations"
import type { AdapterFunctions } from "./types/AdapterFunctions"
import type { Operation } from "./types/Operation"
import type { Ref } from "./types/Ref"
import type { RocRequest } from "./types/RocRequest"
import { createRef } from "./utils/createRef"
import { Snowflake } from "./utils/Snowflake"

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
    functions: AdapterFunctions<
        RocRequest,
        {},
        Entities,
        AdapterOptions<Operations, Entities, EngineOptions>
    >
    operations: Operations
    entities: Entities
    changeSetRefs: Ref[]
    snowflake: Snowflake
    async?: boolean
    changeSetRef?: Ref
    initChangeSetOnce?: boolean
}
export const createAdapter = <
    const Operations extends readonly Operation[],
    const Entities extends readonly EntityN[],
    const EngineOptions extends {} = {},
>(
    adapterOptions: AdapterOptions<Operations, Entities, EngineOptions>,
    engineOptions: EngineOptions = {} as EngineOptions,
) => {
    type FunctionMap = {
        [Item in (typeof adapterOptions.operations)[number] as Item["operationName"]]: Item
    }

    const operationsMap: FunctionMap = Object.fromEntries(
        [
            pageMutations,
            createPageEntitiesOperation(adapterOptions.entities),
            ...adapterOptions.operations,
        ].map(
            operation =>
                [
                    operation.operationName,
                    (payload, changeSetRef, optimisticMutation = undefined) => {
                        const request = operation(
                            payload,
                            changeSetRef || adapterOptions.changeSetRef || null,
                            optimisticMutation,
                        )
                        return execute(request, engineOptions, adapterOptions)
                    },
                ] as const,
        ),
    )

    return {
        get _name() {
            return adapterOptions.name
        },
        get _engineOpts() {
            return engineOptions
        },
        get _entityKinds(): Entities[number]["shape"]["entity"]["value"] {
            return adapterOptions.entities.map(
                schema => schema.shape.entity.value,
            )
        },
        get _operationNames(): Operations[number]["operationName"] {
            return adapterOptions.operations.map(op => op.operationName)
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
        createRef: entity => {
            // return adapterOptions.snowflake.createRef(entity)
            return createRef(
                entity,
                adapterOptions.snowflake,
                new Date().toISOString(),
            )
        },
        changeSet: changeSetRef => {
            return createAdapter(
                { ...adapterOptions, changeSetRef },
                engineOptions,
            )
        },
        syncOptimisticMutation: mutation => {
            const operation = operationsMap[mutation.name]
            return operation(mutation.payload, mutation.changeSetRef, mutation)
        },
        ...operationsMap,
    }
}
