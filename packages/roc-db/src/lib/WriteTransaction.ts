import type { AdapterOptions } from "../types/AdapterOptions"
import type { Entity } from "../types/Entity"
import type { Mutation } from "../types/Mutation"
import type { MutationRef } from "../types/MutationRef"
import type { Ref } from "../types/Ref"
import type { RocRequest } from "../types/RocRequest"
import { ReadTransaction } from "./ReadTransaction"
import { applyChangeSet } from "./applyChangeSet"
import { commit } from "./commit"
import { createEntity } from "./createEntity"
import { createRef } from "./createRef"
import { deleteChangeSet } from "./deleteChangeSet"
import { deleteEntity } from "./deleteEntity"
import { finalizeMutation } from "./finalizeMutation"
import { findDependents } from "./findDependents"
import { patchEntity } from "./patchEntity"
import { readEntity } from "./readEntity"
import { undo } from "./undo"
import { updateEntity } from "./updateEntity"

type UpdateLogItem = readonly ["update", Entity, any]
type CreateLogItem = readonly ["create", Entity]
type DeleteLogItem = readonly ["delete", Entity]
type LogItem = UpdateLogItem | CreateLogItem | DeleteLogItem
type Log = Map<Ref, LogItem>

export class WriteTransaction<
    EngineOpts extends any = any,
> extends ReadTransaction<EngineOpts> {
    mutationFinalized: boolean
    optimisticCreateRefs: string[]
    log: Log

    constructor(
        public request: RocRequest,
        public engineOpts: EngineOpts,
        public adapterOpts: AdapterOptions<EngineOpts>,
        public payload: RocRequest["payload"],
        public mutation: Mutation,
        public optimisticRefs: [string, string, string][] = [],
        changeSet: any = undefined,
    ) {
        super(request, engineOpts, adapterOpts, payload, changeSet)
        this.mutation = mutation
        this.optimisticCreateRefs = optimisticRefs
            .filter(([_, action]) => action === "create")
            .map(([ref]) => ref)
        this.log = new Map([])
        this.mutationFinalized = false
        this.timestamp = this.mutation.timestamp
    }

    applyChangeSet = (ref: Ref) => applyChangeSet(this, ref)
    commit = (isChangeSetApply = false) => commit(this, isChangeSetApply)
    createEntity = (ref: Ref, body: any) => createEntity(this, ref, body)
    createRef = (entity: string) => createRef(this, entity)
    deleteEntity = (ref: Ref, cascade = false) =>
        deleteEntity(this, ref, cascade)
    deleteChangeSet = (changeSetRef: Ref) => deleteChangeSet(this, changeSetRef)
    finalizedMutation = (isChangeSetApply = false) => {
        if (this.mutationFinalized)
            throw new Error("Mutation already finalized")
        this.mutationFinalized = true
        return finalizeMutation(this, isChangeSetApply)
    }
    findDependents = (ref: Ref) => findDependents(this, ref)
    patchEntity = (ref: Ref, args: any) => patchEntity(this, ref, args)
    readEntity = (ref: Ref, throwIfMissing = true) =>
        readEntity(this, ref, throwIfMissing)
    undo = (mutationRef: MutationRef) => undo(this, mutationRef)
    updateEntity = (ref: Ref, body: any) => updateEntity(this, ref, body)
}
