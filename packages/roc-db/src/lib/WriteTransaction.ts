import type { EntityN } from "../createAdapter"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { RocRequest } from "../types/RocRequest"
import { createRef } from "../utils/createRef"
import { entityFromRef } from "../utils/entityFromRef"
import { refsFromRelations } from "../utils/refsFromRelations"
import { parseRequestPayload } from "./parseRequestPayload"
import { ReadTransaction } from "./ReadTransaction"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { runSyncFunctionChain } from "./runSyncFunctionChain"

const findDependentsSync = (txn, ref) => {
    const res = txn.readEntity(ref)
    const children = refsFromRelations(res.children)
    let dependents = []
    for (const childRef of children) {
        dependents.push(...findDependentsSync(txn, childRef))
        dependents.push(childRef)
    }
    return dependents
}
const findDependentsAsync = async (txn, ref) => {
    const res = await txn.readEntity(ref)
    const children = refsFromRelations(res.children)
    let dependents = []
    for (const childRef of children) {
        dependents.push(...(await findDependentsAsync(txn, childRef)))
        dependents.push(childRef)
    }
    return dependents
}

const applyChangeSetSync = (txn, ref) => {
    const res = txn.adapterOpts.functions.getChangeSetMutations(txn, ref)
    if (res.length) {
        for (const mutation of res) {
            const operation = txn.adapterOpts.operations.find(
                o => o.operationName === mutation.name,
            )
            const request = operation(
                mutation.payload,
                null,
                // txn.request.changeSetRef,
                mutation,
            )
            const payload = parseRequestPayload(request)
            const tmpTxn = new WriteTransaction(
                request,
                txn.engineOpts,
                txn.adapterOpts,
                payload,
                mutation,
                mutation.log,
            )
            const res = runSyncFunctionChain(request.callback(tmpTxn))
        }
    }
}
const applyChangeSetAsync = async (txn, ref) => {
    const res = await txn.adapterOpts.functions.getChangeSetMutations(txn, ref)
    if (res.length) {
        for (const mutation of res) {
            const operation = txn.adapterOpts.operations.find(
                o => o.operationName === mutation.name,
            )
            const request = operation(
                mutation.payload,
                null,
                // txn.request.changeSetRef,
                mutation,
            )

            const payload = parseRequestPayload(request)
            const tmpTxn = new WriteTransaction(
                request,
                txn.engineOpts,
                txn.adapterOpts,
                payload,
                mutation,
                mutation.log,
            )
            const res = await runAsyncFunctionChain(request.callback(tmpTxn))
        }
    }
}

export class WriteTransaction<
    Request extends RocRequest,
    EngineOpts extends {},
    Entities extends readonly EntityN[],
    AdapterOpts extends AdapterOptions<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >,
> extends ReadTransaction<Request, EngineOpts, Entities, AdapterOpts> {
    log: Map<string, [string, string, string]>
    mutationFinalized: boolean
    optimisticCreateRefs: string[]

    constructor(
        public request: Request,
        public engineOpts: EngineOpts,
        public adapterOpts: AdapterOpts,
        public payload: Request["payload"],
        public mutation,
        public optimisticRefs: [string, string, string][] = [],
        // public log: Map<string, string>,
    ) {
        super(request, engineOpts, adapterOpts, payload)
        this.mutation = mutation
        this.optimisticCreateRefs = optimisticRefs
            .filter(([_, action]) => action === "create")
            .map(([ref]) => ref)
        this.log = new Map([])
    }

    finalizedMutation = () => {
        if (this.mutationFinalized)
            throw new Error("Mutation already finalized")
        this.mutationFinalized = true
        const doc = {
            ...this.mutation,
            log: Array.from(this.log.values()),
        }
        if ("sessionRef" in doc && !doc.sessionRef) {
            delete doc.sessionRef
        }
        return doc
    }

    applyChangeSet = ref => {
        if (this.adapterOpts.async) {
            return applyChangeSetAsync(this, ref)
        } else {
            return applyChangeSetSync(this, ref)
        }
    }

    createRef = (entity: string) => {
        if (this.optimisticRefs.length) {
            const nextRef = this.optimisticCreateRefs.shift()
            if (!nextRef) throw new Error("No next ref")
            const nextRefEntity = entityFromRef(nextRef)
            if (entity !== nextRefEntity) {
                throw new Error(
                    "Wrong entity. Expected " +
                        entity +
                        " but got " +
                        nextRefEntity,
                )
            }
            return nextRef
        }

        const ref = createRef(
            entity,
            this.adapterOpts.snowflake,
            this.mutation.timestamp,
        )
        return ref
    }
    createEntity = (ref, args) => {
        if (this.log.has(ref)) throw new Error("Entity already created")
        this.log.set(ref, [ref, "create", this.request.changeSetRef])
        return this.adapterOpts.functions.createEntity(this, ref, args)
    }
    updateEntity = (ref, args) => {
        if (this.log.has(ref)) {
            if (this.log.get(ref)[1] === "delete")
                throw new Error("Entity already deleted")
            // If not delete and it exists it is a create, in that case we don't change it
        } else {
            this.log.set(ref, [ref, "update", this.request.changeSetRef])
        }
        return this.adapterOpts.functions.updateEntity(this, ref, args)
    }
    patchEntity = (ref, args) => {
        if (this.log.has(ref)) {
            if (this.log.get(ref)[1] === "delete")
                throw new Error("Entity already deleted")
            // If not delete and it exists it is a create, in that case we don't change it
        } else {
            this.log.set(ref, [ref, "update", this.request.changeSetRef])
        }
        return this.adapterOpts.functions.patchEntity(this, ref, args)
    }
    findDependents = ref => {
        if (this.adapterOpts.async) {
            return findDependentsAsync(this, ref)
        } else {
            return findDependentsSync(this, ref)
        }
    }
    deleteEntity = (ref, cascade = false) => {
        if (this.log.has(ref)) {
            if (this.log.get(ref)[1] === "delete")
                throw new Error("Entity already deleted")
        }
        if (cascade) {
            if (this.adapterOpts.async) {
                return findDependentsAsync(this, ref).then(async res => {
                    for (const dependentRef of res) {
                        this.log.set(dependentRef, [
                            dependentRef,
                            "delete",
                            this.request.changeSetRef,
                        ])
                        await this.adapterOpts.functions.deleteEntity(
                            this,
                            dependentRef,
                        )
                    }
                    this.log.set(ref, [
                        ref,
                        "delete",
                        this.request.changeSetRef,
                    ])
                    return (
                        res.length +
                        (await this.adapterOpts.functions.deleteEntity(
                            this,
                            ref,
                        ))
                    )
                })
            } else {
                const res = findDependentsSync(this, ref)

                if (res.length) {
                    for (const dependentRef of res) {
                        this.log.set(dependentRef, [
                            dependentRef,
                            "delete",
                            this.request.changeSetRef,
                        ])
                        this.adapterOpts.functions.deleteEntity(
                            this,
                            dependentRef,
                        )
                    }
                }
                this.log.set(ref, [ref, "delete", this.request.changeSetRef])
                return (
                    res.length +
                    this.adapterOpts.functions.deleteEntity(this, ref, cascade)
                )
            }
        } else {
            this.log.set(ref, [ref, "delete", this.request.changeSetRef])
            return this.adapterOpts.functions.deleteEntity(this, ref, cascade)
        }
    }
}
