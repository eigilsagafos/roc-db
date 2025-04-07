import { BadRequestError } from "../errors/BadRequestError"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { Ref } from "../types/Ref"
import type { RocRequest } from "../types/RocRequest"
import { refsFromRelations } from "../utils/refsFromRelations"
import { batchReadEntities } from "./batchReadEntities"
import { readEntity } from "./readEntity"
import { readMutation } from "./readMutation"

export class ReadTransaction<EngineOpts extends any = any> {
    changeSetRef: Ref | null
    changeSetInitialized: boolean
    constructor(
        public request: RocRequest,
        public engineOpts: EngineOpts,
        public adapterOpts: AdapterOptions<EngineOpts>,
        public payload: any,
        public changeSet: {
            mutations: Map<any, any>
            entities: Map<any, any>
        } = {
            mutations: new Map(),
            entities: new Map(),
        },
    ) {
        this.request = request
        this.adapterOpts = adapterOpts
        this.engineOpts = engineOpts
        this.payload = payload
        this.changeSetRef = request.changeSetRef
        this.changeSet = changeSet
        this.changeSetInitialized = this.changeSetRef ? false : true
    }

    batchReadEntities = (refs: Ref[]) => batchReadEntities(this, refs)

    getChangeSetMutations = (ref: Ref) => {
        if (!ref)
            throw new BadRequestError(
                "No ref provided to getChangeSetMutations",
            )
        return this.adapterOpts.functions.getChangeSetMutations(this, ref)
    }

    readEntity = (ref: Ref, throwIfNotFound = true) =>
        readEntity(this, ref, throwIfNotFound)

    readMutation = (ref: Ref, throwIfNotFound = true) =>
        readMutation(this, ref, throwIfNotFound)

    pageMutations = args => {
        return this.adapterOpts.functions.pageMutations(this, args)
    }
    pageEntities = args => {
        return this.adapterOpts.functions.pageEntities(this, args)
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
    if (txn.adapterOpts.async) {
        return childRefsOfAsync(txn, [ref], recursive)
    } else {
        return childRefsOfSync(txn, [ref], recursive)
    }
}
