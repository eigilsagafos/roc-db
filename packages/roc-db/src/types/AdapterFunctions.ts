import type { WriteTransaction } from "../lib/WriteTransaction"
import type { Mutation } from "./Mutation"
import type { MutationFacetsArgs, MutationFacetsResult } from "./MutationFacets"
import type { PageMutationsArgs } from "./PageMutationsArgs"
import type { Ref } from "./Ref"
import type { RocDBRequest } from "./RocDBRequest"
import type { Transaction } from "./Transaction"
import type { WriteRequest } from "./WriteRequest"

// --- Optional lifecycle hooks. Core falls back to a default (begin/beginRequest)
// or simply skips the hook (end/onChangeSetInit/onChangeSetApplied) when absent. ---

// Wraps a whole transaction: receives the engine opts and a callback to run
// within the (possibly adapter-managed) transaction scope.
export type BeginFunction<EngineOpts extends any = any> = (
    engineOpts: EngineOpts,
    callback: (engineOpts: EngineOpts) => any,
) => any

// Wraps a single request within a transaction.
export type BeginRequestFunction<EngineOpts extends any = any> = (
    request: RocDBRequest,
    engineOpts: EngineOpts,
    callback: (engineOpts: EngineOpts, cacheMap?: any) => any,
) => any

export type EndFunction<EngineOpts extends any = any> = (
    txn: Transaction<EngineOpts>,
) => EngineOpts

export type OnChangeSetInitFunction<EngineOpts extends any = any> = (
    engineOpts: EngineOpts,
    adapterOptions: any,
    changeSetRef: Ref,
) => EngineOpts

export type OnChangeSetAppliedFunction<EngineOpts extends any = any> = (
    txn: WriteTransaction<EngineOpts>,
    changeSetRef: Ref,
) => any

// --- Required engine functions (core reads these unconditionally). ---

export type CommitFunction<EngineOpts extends any = any> = (
    txn: WriteTransaction<EngineOpts>,
    finalizedMutation: Mutation,
    changes: { created: any[]; updated: any[]; deleted: Ref[] },
) => any

export type FindDebounceMutationFunction<EngineOpts extends any = any> = (
    // Debounce is a write-only concern; core only calls this for write requests.
    request: WriteRequest,
    engineOpts: EngineOpts,
    now: Date,
    operationName: string,
    identityRef: string,
) => Mutation | null | undefined

export type GetChangeSetMutationsFunction<EngineOpts extends any = any> = (
    txn: Transaction<EngineOpts>,
    changeSetRef: Ref,
) => Mutation[]

export type PageEntitiesFunction<EngineOpts extends any = any> = (
    txn: Transaction<EngineOpts>,
    args: any,
) => any

export type PageEntitiesByIndexFunction<EngineOpts extends any = any> = (
    txn: Transaction<EngineOpts>,
    entity: string,
    key: string,
    value: any,
) => any

// Adapters may be sync (valdres/in-memory) or async (postgres/indexed-db), so
// the result type covers both. `args` is optional and, unlike the operation
// layer, un-defaulted: a missing `size` here means unbounded.
export type PageMutationsFunction<EngineOpts extends any = any> = (
    txn: Transaction<EngineOpts>,
    args?: PageMutationsArgs,
) => Mutation[] | Promise<Mutation[]>

export type MutationFacetsFunction<EngineOpts extends any = any> = (
    txn: Transaction<EngineOpts>,
    args?: MutationFacetsArgs,
) => MutationFacetsResult | Promise<MutationFacetsResult>

export type ReadEntityFunctiun<EngineOpts extends any = any> = (
    txn: Transaction<EngineOpts>,
    ref: Ref,
    throwIfNotFound?: boolean,
) => any

export type ReadMutationFunction<EngineOpts extends any = any> = (
    // First arg is a txn in some adapters, engine opts in others.
    txnOrEngineOpts: any,
    ref: Ref,
    throwIfNotFound?: boolean,
) => Mutation | null

export type RefByUniqueFieldFunction<EngineOpts extends any = any> = (
    txn: Transaction<EngineOpts>,
    entity: string,
    field: string,
    fieldIndex: number,
    value: any,
) => Ref | null

export type SaveMutationFunction<EngineOpts extends any = any> = (
    txn: WriteTransaction<EngineOpts>,
    finalizedMutation: Mutation,
) => Mutation

// --- WriteTransaction helper types. These type the core write operations
// (`txn.createEntity`/`txn.patchEntity`/`txn.updateEntity`) and the
// adapter-internal commit helpers some adapters implement against them (e.g.
// indexed-db's `commitCreate: CreateEntityFunction`). They are NOT part of the
// AdapterFunctions contract: core never reads `functions.createEntity` — those
// operations live on WriteTransaction. ---

export type CreateEntityFunction<EngineOpts extends any = any> = (
    txn: WriteTransaction<EngineOpts>,
    ref: Ref,
    args: any,
) => any

export type UpdateEntityFunction<EngineOpts extends any = any> = (
    txn: WriteTransaction<EngineOpts>,
    ref: Ref,
    args: any,
) => any

export type PatchEntityFunction<EngineOpts extends any = any> = (
    txn: WriteTransaction<EngineOpts>,
    ref: Ref,
) => any

// The engine functions an adapter supplies to `createAdapter`.
export type AdapterFunctions<EngineOpts extends any = any> = {
    // Optional lifecycle hooks.
    begin?: BeginFunction<EngineOpts>
    beginRequest?: BeginRequestFunction<EngineOpts>
    end?: EndFunction<EngineOpts>
    onChangeSetInit?: OnChangeSetInitFunction<EngineOpts>
    onChangeSetApplied?: OnChangeSetAppliedFunction<EngineOpts>
    // Required engine functions.
    commit: CommitFunction<EngineOpts>
    findDebounceMutation: FindDebounceMutationFunction<EngineOpts>
    getChangeSetMutations: GetChangeSetMutationsFunction<EngineOpts>
    mutationFacets: MutationFacetsFunction<EngineOpts>
    pageEntities: PageEntitiesFunction<EngineOpts>
    pageEntitiesByIndex: PageEntitiesByIndexFunction<EngineOpts>
    pageMutations: PageMutationsFunction<EngineOpts>
    readEntity: ReadEntityFunctiun<EngineOpts>
    readMutation: ReadMutationFunction<EngineOpts>
    refByUniqueField: RefByUniqueFieldFunction<EngineOpts>
    saveMutation: SaveMutationFunction<EngineOpts>
}
