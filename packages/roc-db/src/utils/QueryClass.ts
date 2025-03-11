import { QueryChainClass } from "./QueryChainClass"

export class QueryClass<I extends any[], O> {
    constructor(public fn: (...args: I) => O | QueryChainClass<O>) {
        this.fn = fn
    }
}
