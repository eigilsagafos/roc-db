import type { AdapterOptions } from "../types/AdapterOptions"
import type { Entity } from "../types/Entity"
import type { Mutation } from "../types/Mutation"
import type { MutationRef } from "../types/MutationRef"
import type { ReadEntityResult } from "../types/ReadEntityResult"
import type { Ref } from "../types/Ref"
import type { RocDBRequest } from "../types/RocDBRequest"
import { ReadTransaction } from "./ReadTransaction"
import { applyChangeSet } from "./applyChangeSet"
import { commit } from "./commit"
import { createEntity } from "./createEntity"
import { createRef } from "./createRef"
import { deleteChangeSet } from "./deleteChangeSet"
import {
    duplicateChangeSetMutations,
    type DuplicateChangeSetMutationsOptions,
} from "./duplicateChangeSetMutations"
import { deleteEntity } from "./deleteEntity"
import { finalizeMutation } from "./finalizeMutation"
import { findDependents } from "./findDependents"
import { patchEntity } from "./patchEntity"
import { readEntity } from "./readEntity"
import { undo } from "./undo"
import { updateEntity } from "./updateEntity"

type UpdateLogItem = readonly ["update", Entity, any, any?, any?]
type CreateLogItem = readonly ["create", Entity]
type DeleteLogItem = readonly ["delete", Entity?]
type RefLogItem = readonly ["ref"]
type LogItem = UpdateLogItem | CreateLogItem | DeleteLogItem | RefLogItem
type Log = Map<Ref, LogItem>

export class WriteTransaction<
    EngineOpts extends any = any,
    Payload = any,
> extends ReadTransaction<EngineOpts, Payload> {
    mutationFinalized: boolean
    optimisticCreateRefs: string[]
    log: Log
    timestamp: string

    constructor(
        public request: RocDBRequest,
        public engineOpts: EngineOpts,
        public adapter: AdapterOptions<EngineOpts>,
        public payload: Payload,
        public mutation: Mutation,
        public optimisticRefs: [string, string, string][] = [],
        changeSet: any = undefined,
        log: Log = new Map(),
    ) {
        super(request, engineOpts, adapter, payload, changeSet)
        this.mutation = mutation
        this.optimisticCreateRefs = optimisticRefs
            .filter(([_, action]) => action === "create")
            .map(([ref]) => ref)
        this.log = log
        this.mutationFinalized = false
        this.timestamp = this.mutation.timestamp
    }

    applyChangeSet = (ref: Ref) => applyChangeSet(this, ref)
    commit = (isChangeSetApply = false) => commit(this, isChangeSetApply)
    createEntity = <R extends Ref>(ref: R, body: any): ReadEntityResult<R> =>
        createEntity(this, ref, body) as ReadEntityResult<R>
    createRef = <E extends string>(entity: E) => createRef(this, entity)
    deleteEntity = (ref: Ref, cascade = false) =>
        deleteEntity(this, ref, cascade)
    deleteChangeSet = (changeSetRef: Ref) => deleteChangeSet(this, changeSetRef)
    duplicateChangeSetMutations = (
        sourceChangeSetRef: Ref,
        targetChangeSetRef: Ref,
        options: DuplicateChangeSetMutationsOptions = {},
    ) =>
        duplicateChangeSetMutations(
            this,
            sourceChangeSetRef,
            targetChangeSetRef,
            options,
        )
    finalizedMutation = (isChangeSetApply = false) => {
        if (this.mutationFinalized)
            throw new Error("Mutation already finalized")
        this.mutationFinalized = true
        return finalizeMutation(this, isChangeSetApply)
    }
    findDependents = (ref: Ref): Ref[] => findDependents(this, ref) as Ref[]
    patchEntity = (ref: Ref, args: any) => patchEntity(this, ref, args)
    readEntity = <R extends Ref>(
        ref: R,
        throwIfMissing = true,
    ): ReadEntityResult<R> =>
        readEntity(this, ref, throwIfMissing) as ReadEntityResult<R>
    undo = (mutationRef: MutationRef) => undo(this, mutationRef)
    // `redo` is invoked by the redo operation but not wired as an instance
    // method here; declared type-only so callers type-check without changing
    // runtime behavior.
    declare redo: (mutationRef: MutationRef) => any
    updateEntity = (ref: Ref, body: any) => updateEntity(this, ref, body)
}
