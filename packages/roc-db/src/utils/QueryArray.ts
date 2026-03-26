import { QueryArrayClass } from "./QueryArrayClass"
import type { QueryChainClass } from "./QueryChainClass"
import type { QueryClass } from "./QueryClass"

type UnwrapQueryResult<T> = T extends QueryChainClass<infer O>
    ? O
    : T extends QueryClass<any, infer O>
      ? O
      : T extends QueryArrayClass<infer O>
        ? O
        : unknown

export type QueryArrayType = (
    | QueryChainClass<any>
    | QueryClass<any, any>
    | QueryArrayClass
)[]

export const QueryArray = <T extends QueryArrayType>(arr: T): QueryArrayClass<UnwrapQueryResult<T[number]>[]> => {
    return new QueryArrayClass(arr) as QueryArrayClass<UnwrapQueryResult<T[number]>[]>
}
