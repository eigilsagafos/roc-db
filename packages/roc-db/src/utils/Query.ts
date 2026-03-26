import type { QueryArrayClass } from "./QueryArrayClass"
import { QueryChainClass } from "./QueryChainClass"
import { QueryClass } from "./QueryClass"
import type { QueryObjectClass } from "./QueryObjectClass"

export const Query = <I extends any[], O>(
    fn: (
        ...args: I
    ) =>
        | O
        | QueryClass<any[], O>
        | QueryChainClass<O>
        | QueryObjectClass<O & Record<string, unknown>>
        | QueryArrayClass<O>,
): QueryClass<I, O> => {
    return new QueryClass(fn as (...args: I) => O | QueryChainClass<O>)
}
