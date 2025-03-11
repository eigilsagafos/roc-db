import { executeReadRequestSync } from "./executeReadRequestSync"
import { executeWriteRequestSync } from "./executeWriteRequestSync"

export const executeSync = (request, engineOpts, adapterOpts) => {
    if (request.type === "write") {
        return executeWriteRequestSync(request, engineOpts, adapterOpts)
    } else {
        return executeReadRequestSync(request, engineOpts, adapterOpts)
    }
}
