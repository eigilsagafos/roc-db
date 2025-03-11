import { EntityN } from "../createAdapter"
import type { WriteTransaction } from "../lib/WriteTransaction"
import type { AdapterOptions } from "./AdapterOptions"
import type { Mutation } from "./Mutation"
import type { Ref } from "./Ref"
import type { RocRequest } from "./RocRequest"
import type { Transaction } from "./Transaction"

export type BeginFunction<EngineOptions> = (
    request: RocRequest,
    engineOpts: EngineOptions,
) => EngineOptions

export type EndFunction<
    Request extends RocRequest,
    EngineOpts extends {},
    Entities extends readonly EntityN[],
    AdapterOpts extends AdapterOptions<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >,
> = (txn: Transaction<Request, EngineOpts, Entities, AdapterOpts>) => EngineOpts

export type CreateEntityFunction<
    Request extends RocRequest,
    EngineOpts extends {},
    Entities extends readonly EntityN[],
    AdapterOpts extends AdapterOptions<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >,
> = (
    txn: WriteTransaction<Request, EngineOpts, Entities, AdapterOpts>,
    ref: Ref,
    args: any,
) => any
export type UpdateEntityFunction<
    Request extends RocRequest,
    EngineOpts extends {},
    Entities extends readonly EntityN[],
    AdapterOpts extends AdapterOptions<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >,
> = (
    txn: WriteTransaction<Request, EngineOpts, Entities, AdapterOpts>,
    ref: Ref,
    args: any,
) => any

export type SaveMutationFunction<
    Request extends RocRequest,
    EngineOpts extends {},
    Entities extends readonly EntityN[],
    AdapterOpts extends AdapterOptions<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >,
> = (
    txn: WriteTransaction<Request, EngineOpts, Entities, AdapterOpts>,
) => Mutation

export type PatchEntityFunction<
    Request extends RocRequest,
    EngineOpts extends {},
    Entities extends readonly EntityN[],
    AdapterOpts extends AdapterOptions<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >,
> = (
    txn: WriteTransaction<Request, EngineOpts, Entities, AdapterOpts>,
    ref: Ref,
) => any

export type AdapterFunctions<
    Request extends RocRequest,
    EngineOpts extends {},
    Entities extends readonly EntityN[],
    AdapterOpts extends AdapterOptions<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >,
> = {
    begin?: BeginFunction<EngineOpts>
    end?: EndFunction<Request, EngineOpts, Entities, AdapterOpts>
    createEntity: CreateEntityFunction<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >
    patchEntity: PatchEntityFunction<Request, EngineOpts, Entities, AdapterOpts>
    saveMutation: SaveMutationFunction<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >
    updateEntity: UpdateEntityFunction<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >
}
