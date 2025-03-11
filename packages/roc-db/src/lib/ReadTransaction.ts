import type { EntityN } from "../createAdapter"
import { NotFoundError } from "../errors/NotFoundError"
import type { AdapterOptions } from "../types/AdapterOptions"
import type { RocRequest } from "../types/RocRequest"

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
        if (!res && throwIfNotFound) throw new NotFoundError(ref)
        return res
    }
    pageMutations = args => {
        return this.adapterOpts.functions.pageMutations(this, args)
    }
    pageEntities = args => {
        return this.adapterOpts.functions.pageEntities(this, args)
    }
}
