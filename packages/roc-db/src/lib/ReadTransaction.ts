import type { EntityN } from "../createAdapter"
import { NotFoundError } from "../errors/NotFoundError"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { RocRequest } from "../types/RocRequest"
import { refsFromRelations } from "../utils/refsFromRelations"

export class ReadTransaction<
    Request extends RocRequest,
    EngineOpts extends {},
    Entities extends readonly EntityN[],
    AdapterOpts extends AdapterOptions<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >,
> {
    constructor(
        public request: Request,
        public engineOpts: EngineOpts,
        public adapterOpts: AdapterOpts,
        public payload: Request["payload"],
    ) {
        this.request = request
        this.adapterOpts = adapterOpts
        this.engineOpts = engineOpts
        this.payload = payload
    }

    batchReadEntities = (refs, throwIfNotFound = false) => {
        return this.adapterOpts.functions.batchReadEntities(
            this,
            refs,
            throwIfNotFound,
        )
    }
    readEntity = (ref, throwIfNotFound = false) => {
        const res = this.adapterOpts.functions.readEntity(this, ref)
        if (this.adapterOpts.async) {
            return res.then(res => {
                if (!res && throwIfNotFound) throw new NotFoundError(ref)
                return res
            })
        } else {
            if (!res && throwIfNotFound) throw new NotFoundError(ref)
            return res
        }
    }
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
