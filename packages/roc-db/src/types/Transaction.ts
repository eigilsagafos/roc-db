import { EntityN } from "../createAdapter"
import { ReadTransaction } from "../lib/ReadTransaction"
import { WriteTransaction } from "../lib/WriteTransaction"
import { AdapterOptions } from "./AdapterOptions"
import { RocRequest } from "./RocRequest"

export type Transaction<
    Request extends RocRequest,
    EngineOpts extends {},
    Entities extends readonly EntityN[],
    AdapterOpts extends AdapterOptions<
        Request,
        EngineOpts,
        Entities,
        AdapterOpts
    >,
> =
    | ReadTransaction<Request, EngineOpts, Entities, AdapterOpts>
    | WriteTransaction<Request, EngineOpts, Entities, AdapterOpts>
