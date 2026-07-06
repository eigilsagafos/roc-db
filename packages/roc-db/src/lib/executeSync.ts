import type { RocDBRequest } from "../types/RocDBRequest"
import { executeReadRequestSync } from "./executeReadRequestSync"
import { executeWriteRequestSync } from "./executeWriteRequestSync"
import { isWriteRequest } from "./isWriteRequest"

export const executeSync = (
    request: RocDBRequest,
    engineOpts: any,
    adapter: any,
) => {
    if (isWriteRequest(request)) {
        return executeWriteRequestSync(request, engineOpts, adapter)
    } else {
        return executeReadRequestSync(request, engineOpts, adapter)
    }
}
