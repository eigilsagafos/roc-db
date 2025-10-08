import { BadRequestError } from "../errors/BadRequestError"
import type { AdapterOptions } from "../types/AdapterOptions"
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

export class ReadTransaction<EngineOpts extends any = any> {
    changeSetRef: Ref | null
    constructor(
        public request: RocDBRequest,
        public engineOpts: EngineOpts,
        public adapter: AdapterOptions<EngineOpts>,
        public payload: any,
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

    batchReadEntities = (refs: Ref[]) => batchReadEntities(this, refs)

    getChangeSetMutations = (ref: Ref) => {
        if (!ref)
            throw new BadRequestError(
                "No ref provided to getChangeSetMutations",
            )
        return this.adapter.functions.getChangeSetMutations(this, ref)
    }

    readEntity = (ref: Ref, throwIfNotFound = true) =>
        readEntity(this, ref, throwIfNotFound)

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
    childRefsOf = (ref, recursive = false) => {
        return childRefsOf(this, ref, recursive)
    }
}

const childRefsOfSync = (txn, refs, recursive) => {
    const docs = txn.batchReadEntities(refs)
    const childRefs = docs.flatMap(doc => refsFromRelations(doc.children))
    if (recursive) {
        return childRefs.flatMap(ref => [
            ...childRefsOfSync(txn, [ref], recursive),
            ref,
        ])
    } else {
        return childRefs
    }
}

const childRefsOfAsync = async (txn, refs, recursive) => {
    const docs = await txn.batchReadEntities(refs)
    const childRefs = docs.flatMap(doc => refsFromRelations(doc.children))

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

const childRefsOf = (txn, ref, recursive) => {
    if (txn.adapter.async) {
        return childRefsOfAsync(txn, [ref], recursive)
    } else {
        return childRefsOfSync(txn, [ref], recursive)
    }
}
