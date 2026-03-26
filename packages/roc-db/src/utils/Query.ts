import type { QueryArrayClass } from "./QueryArrayClass"
import { QueryChainClass } from "./QueryChainClass"
import { QueryClass } from "./QueryClass"
import type { QueryObjectClass } from "./QueryObjectClass"

type UnwrapReturnType<T> = T extends QueryClass<any[], infer O>
    ? O
    : T extends QueryChainClass<infer O>
      ? O
      : T extends QueryObjectClass<infer O>
        ? O
        : T extends QueryArrayClass<infer O>
          ? O
          : T

export const Query = <I extends any[], R>(
    fn: (...args: I) => R,
): QueryClass<I, UnwrapReturnType<R>> => {
    return new QueryClass(fn as (...args: I) => UnwrapReturnType<R> | QueryChainClass<UnwrapReturnType<R>>)
}
