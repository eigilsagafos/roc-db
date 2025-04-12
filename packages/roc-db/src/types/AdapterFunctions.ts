import type { WriteTransaction } from "../lib/WriteTransaction"
import type { Mutation } from "./Mutation"
import type { Ref } from "./Ref"
import type { RocDBRequest } from "./RocDBRequest"
import type { Transaction } from "./Transaction"

export type BeginFunction<EngineOptions> = (
    request: RocDBRequest,
    engineOpts: EngineOptions,
) => EngineOptions

export type ReadEntityFunctiun<EngineOpts extends any = any> = (
    txn: Transaction<EngineOpts>,
    ref: Ref,
) => any

export type EndFunction<EngineOpts extends any = any> = (
    txn: Transaction<EngineOpts>,
) => EngineOpts

export type CreateEntityFunction<EngineOpts extends any = any> = (
    txn: WriteTransaction<EngineOpts>,
    ref: Ref,
    args: any,
) => any

export type GetChangeSetMutationsFunction<EngineOpts extends any = any> = (
    txn: Transaction<EngineOpts>,
    changeSetRef: Ref,
) => Mutation[]

export type UpdateEntityFunction<EngineOpts extends any = any> = (
    txn: WriteTransaction<EngineOpts>,
    ref: Ref,
    args: any,
) => any

export type SaveMutationFunction<EngineOpts extends any = any> = (
    txn: WriteTransaction<EngineOpts>,
) => Mutation

export type PatchEntityFunction<EngineOpts extends any = any> = (
    txn: WriteTransaction<EngineOpts>,
    ref: Ref,
) => any

export type AdapterFunctions<EngineOpts extends any = any> = {
    begin?: BeginFunction<EngineOpts>
    end?: EndFunction<EngineOpts>
    createEntity: CreateEntityFunction<EngineOpts>
    getChangeSetMutations: GetChangeSetMutationsFunction<EngineOpts>
    patchEntity: PatchEntityFunction<EngineOpts>
    readEntity: ReadEntityFunctiun<EngineOpts>
    saveMutation: SaveMutationFunction<EngineOpts>
    updateEntity: UpdateEntityFunction<EngineOpts>
}
