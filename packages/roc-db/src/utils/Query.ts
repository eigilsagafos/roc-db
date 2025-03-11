import { QueryChainClass } from "./QueryChainClass"
import { QueryClass } from "./QueryClass"

export const Query = <I extends any[], O>(
    fn: (...args: I) => O | QueryChainClass<O>,
): QueryClass<I, O> => {
    return new QueryClass(fn)
}
