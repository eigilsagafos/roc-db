import { QueryBaseClass } from "../utils/QueryBaseClass"
import { QueryChainClass } from "../utils/QueryChainClass"
import { QueryClass } from "../utils/QueryClass"
import { QueryObjectClass } from "../utils/QueryObjectClass"

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
            if (res instanceof QueryBaseClass) {
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
        const res = await query.fn(...args)
        if (res instanceof QueryBaseClass) {
            return runAsyncFunctionChain(res)
        } else if (Array.isArray(res) && res.length) {
            if (res.some(isPromiseLike)) {
                return await Promise.all(res)
            } else {
                return res
            }
        } else {
            return res
        }
    } else if (query instanceof QueryObjectClass) {
        const resultObj = []
        for (const [key, q] of Object.entries(query.map)) {
            const result = await runAsyncFunctionChain(q)
            resultObj[key] = result
        }
        return resultObj
    }
}
