import { QueryBaseClass } from "./QueryBaseClass"
import { QueryChainClass } from "./QueryChainClass"

export class QueryClass<I extends any[], O> extends QueryBaseClass{
    constructor(public fn: (...args: I) => O | QueryChainClass<O>) {
        super()
        this.fn = fn
    }
}
