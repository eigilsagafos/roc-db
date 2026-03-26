import { BadRequestError } from "../errors/BadRequestError"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { ReadEntityResult } from "../types/ReadEntityResult"
import type { Ref } from "../types/Ref"
import type { RocDBRequest } from "../types/RocDBRequest"
import { refsFromRelations } from "../utils/refsFromRelations"
import { batchReadEntities } from "./batchReadEntities"
import { readEntity } from "./readEntity"
import { readEntityByUniqueField } from "./readEntityByUniqueField"
import { readMutation } from "./readMutation"
import { generateTransactionCache } from "../lib/generateTransactionCache"

type ChangeSetCache = {
    mutations: Map<any, any>
    entities: Map<any, any>
    entitiesUnique: Map<any, any>
    entitiesIndex: Map<any, any>
    initialized: boolean
}

export class ReadTransaction<EngineOpts extends any = any, Payload = any> {
    changeSetRef: Ref | null
    constructor(
        public request: RocDBRequest,
        public engineOpts: EngineOpts,
        public adapter: AdapterOptions<EngineOpts>,
        public payload: Payload,
        public changeSet: ChangeSetCache,
    ) {
        this.request = request
        this.adapter = adapter
        this.engineOpts = engineOpts
        this.payload = payload
        this.changeSetRef = request.changeSetRef
        if (changeSet) {
            this.changeSet = changeSet
        } else {
            if (this.changeSetRef) {
                this.changeSet = generateTransactionCache(false)
            } else {
                this.changeSet = generateTransactionCache(true)
            }
        }
    }

    batchReadEntities = <R extends Ref>(refs: R[]): ReadEntityResult<R>[] =>
        batchReadEntities(this, refs) as ReadEntityResult<R>[]

    getChangeSetMutations = (ref: Ref) => {
        if (!ref)
            throw new BadRequestError(
                "No ref provided to getChangeSetMutations",
            )
        return this.adapter.functions.getChangeSetMutations(this, ref)
    }

    readEntity = <R extends Ref>(ref: R, throwIfNotFound = true): ReadEntityResult<R> =>
        readEntity(this, ref, throwIfNotFound) as ReadEntityResult<R>

    readEntityByUniqueField = (entity, field, value, throwIfNotFound = true) =>
        readEntityByUniqueField(this, entity, field, value, throwIfNotFound)

    readMutation = (ref: Ref, throwIfNotFound = true) =>
        readMutation(this, ref, throwIfNotFound)

    pageMutations = args => {
        return this.adapter.functions.pageMutations(this, args)
    }
    pageEntities = args => {
        return this.adapter.functions.pageEntities(this, args)
    }
    pageEntitiesByIndex = (entity, key, value) => {
        return this.adapter.functions.pageEntitiesByIndex(
            this,
            entity,
            key,
            value,
        )
    }
    childRefsOf = (ref: Ref, recursive = false): Ref[] => {
        return childRefsOf(this, ref, recursive)
    }
}

const childRefsOfSync = (txn: ReadTransaction, refs: Ref[], recursive: boolean): Ref[] => {
    const docs = txn.batchReadEntities(refs)
    const childRefs: Ref[] = docs.flatMap(doc => refsFromRelations(doc.children))
    if (recursive) {
        return childRefs.flatMap(ref => [
            ...childRefsOfSync(txn, [ref], recursive),
            ref,
        ])
    } else {
        return childRefs
    }
}

const childRefsOfAsync = async (txn: ReadTransaction, refs: Ref[], recursive: boolean): Promise<Ref[]> => {
    const docs = await txn.batchReadEntities(refs)
    const childRefs: Ref[] = docs.flatMap(doc => refsFromRelations(doc.children))

    if (recursive) {
        const nestedRefs = await Promise.all(
            childRefs.map(async ref => [
                ...(await childRefsOfAsync(txn, [ref], recursive)),
                ref,
            ]),
        )
        return nestedRefs.flat()
    } else {
        return childRefs
    }
}

const childRefsOf = (txn: ReadTransaction, ref: Ref, recursive: boolean): Ref[] => {
    if (txn.adapter.async) {
        return childRefsOfAsync(txn, [ref], recursive) as any
    } else {
        return childRefsOfSync(txn, [ref], recursive)
    }
}
