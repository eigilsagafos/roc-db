import { EntityN } from "../createAdapter"
import { AdapterFunctions } from "./AdapterFunctions"
import { RocRequest } from "./RocRequest"

export type AdapterOptions<
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
    functions: AdapterFunctions<Request, EngineOpts, Entities, AdapterOpts>
}
