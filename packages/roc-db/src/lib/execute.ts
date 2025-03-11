import { AdapterOptions } from "../types/AdapterOptions"
import { RocRequest } from "../types/RocRequest"
import { executeAsync } from "./executeAsync"
import { executeSync } from "./executeSync"

export const execute = <
    Request extends RocRequest,
    EngineOpts extends {},
    AdapterOpts extends AdapterOptions,
>(
    request: Request,
    engineOpts: EngineOpts,
    adapterOpts: AdapterOpts,
) => {
    if (adapterOpts.async) {
        return executeAsync(request, engineOpts, adapterOpts)
    } else {
        return executeSync(request, engineOpts, adapterOpts)
    }
}
