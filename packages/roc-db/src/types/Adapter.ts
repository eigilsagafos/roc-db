import type { z, ZodType } from "zod"
import type { Mutation } from "./Mutation"
import type { Operation } from "./Operation"
import type { Ref } from "./Ref"

type OperationMethod<Op extends Operation> = Op extends {
    type: "write"
    payloadSchema: infer P extends ZodType
}
    ? (payload: z.input<P>) => [any, Mutation]
    : Op extends { payloadSchema: infer P extends ZodType }
      ? (payload: z.input<P>) => any
      : never

type OperationMethods<Operations extends readonly Operation[]> = {
    [Item in Operations[number] as Item["name"]]: OperationMethod<Item>
}

export type Adapter<
    Operations extends readonly Operation[] = readonly Operation[],
    EngineOptions extends {} = {},
> = {
    readonly _name: string
    readonly _engineOpts: EngineOptions
    readonly _adapterOpts: any
    readonly _entityKinds: string[]
    readonly _operationNames: string[]
    readonly _operations: readonly Operation[]
    readonly _entities: readonly any[]
    clone: (overrides?: Partial<EngineOptions>) => Adapter<Operations, EngineOptions>
    generateRef: (entity: string) => Ref
    changeSet: (changeSetRef: Ref) => Adapter<Operations, EngineOptions>
    loadMutations?: (mutations: Mutation[]) => any
    persistOptimisticMutations?: (mutations: Mutation[]) => Mutation[]
} & OperationMethods<Operations>
