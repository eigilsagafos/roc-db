import { executeReadRequestAsync } from "./executeReadRequestAsync"
import { executeWriteRequestAsync } from "./executeWriteRequestAsync"

export const executeAsync = async (request, engineOpts, adapterOpts) => {
    if (request.type === "write") {
        return executeWriteRequestAsync(request, engineOpts, adapterOpts)
    } else {
        return executeReadRequestAsync(request, engineOpts, adapterOpts)
    }
}
