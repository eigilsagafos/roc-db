import { QueryChainClass } from "../utils/QueryChainClass"
import { QueryClass } from "../utils/QueryClass"

const isFunction = (value: any) => typeof value === "function"

export const runSyncFunctionChain = (query, args = []) => {
    if (query instanceof QueryChainClass) {
        let results: any[] = []
        let lastRes: any = undefined
        for (const q of query.queries) {
            let res = runSyncFunctionChain(q, results)
            if (res instanceof QueryChainClass) {
                throw new Error("TODO: do we ever get here?")
                lastRes = runSyncFunctionChain(res)
            }
            lastRes = res
            results.unshift(lastRes)
        }

        return lastRes
    } else if (query instanceof QueryClass) {
        return query.fn(...args)
    }
}
