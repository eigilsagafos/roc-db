import { QueryChainClass } from "../utils/QueryChainClass"
import { QueryClass } from "../utils/QueryClass"

const isPromiseLike = (value: any): value is PromiseLike<any> =>
    value && typeof value.then === "function"

export const runAsyncFunctionChain = async (query, args = []) => {
    if (query instanceof QueryChainClass) {
        let results: any[] = []
        let lastRes: any = undefined
        for (const q of query.queries) {
            let res = runAsyncFunctionChain(q, results)

            if (isPromiseLike(res)) {
                res = await res
            }
            if (res instanceof QueryChainClass) {
                lastRes = await runAsyncFunctionChain(res)
                // throw new Error("TOPDO")
            }
            if (Array.isArray(res) && res.length) {
                if (res.some(isPromiseLike)) {
                    lastRes = await Promise.all(res)
                    // } else if (res.every(isFunction)) {
                    //     lastRes = await runAsyncFunctionChain(res)
                } else {
                    lastRes = res
                }
            } else {
                lastRes = res
            }
            results.unshift(lastRes)
        }

        return lastRes
    } else if (query instanceof QueryClass) {
        return query.fn(...args)
    } else {
        throw new Error("Unsupported query type")
    }
}
