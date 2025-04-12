import type { RocDBRequest } from "../types/RocDBRequest"
import { executeReadRequestAsync } from "./executeReadRequestAsync"
import { executeWriteRequestAsync } from "./executeWriteRequestAsync"
import { isWriteRequest } from "./isWriteRequest"

export const executeAsync = async (
    request: RocDBRequest,
    engineOpts,
    adapter,
) => {
    if (isWriteRequest(request)) {
        return executeWriteRequestAsync(request, engineOpts, adapter)
    } else {
        return executeReadRequestAsync(request, engineOpts, adapter)
    }
}
