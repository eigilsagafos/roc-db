import { QueryBaseClass } from "../utils/QueryBaseClass"
import { QueryChainClass } from "../utils/QueryChainClass"
import { QueryClass } from "../utils/QueryClass"
import { QueryObjectClass } from "../utils/QueryObjectClass"

export const runSyncFunctionChain = (query, args = []) => {
    if (query instanceof QueryChainClass) {
        let results: any[] = []
        let lastRes: any = undefined
        for (const q of query.queries) {
            let res = runSyncFunctionChain(q, results)

            if (res instanceof QueryBaseClass) {
                // throw new Error("TODO: do we ever get here?")
                lastRes = runSyncFunctionChain(res)
            }
            lastRes = res
            results.unshift(lastRes)
        }

        return lastRes
    } else if (query instanceof QueryClass) {
        const res = query.fn(...args)
        if (res instanceof QueryBaseClass) {
            return runSyncFunctionChain(res)
        } else {
            return res
        }
    } else if (query instanceof QueryObjectClass) {
        return Object.fromEntries(
            Object.entries(query.map).map(([key, q]) => [
                key,
                runSyncFunctionChain(q),
            ]),
        )
    }
}
