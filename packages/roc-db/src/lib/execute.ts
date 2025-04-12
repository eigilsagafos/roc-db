import type { AdapterOptions } from "../types/AdapterOptions"
import type { RocDBRequest } from "../types/RocDBRequest"
import { executeAsync } from "./executeAsync"
import { executeSync } from "./executeSync"

export const execute = <
    Request extends RocDBRequest,
    EngineOpts extends {},
    AdapterOpts extends AdapterOptions,
>(
    request: Request,
    engineOpts: EngineOpts,
    adapter: AdapterOpts,
) => {
    if (adapter.async) {
        return executeAsync(request, engineOpts, adapter)
    } else {
        return executeSync(request, engineOpts, adapter)
    }
}
