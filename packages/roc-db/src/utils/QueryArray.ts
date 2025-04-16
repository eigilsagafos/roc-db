import { QueryArrayClass } from "./QueryArrayClass"
import type { QueryChainClass } from "./QueryChainClass"
import type { QueryClass } from "./QueryClass"

export type QueryArrayType = (
    | QueryChainClass<any>
    | QueryClass<any, any>
    | QueryArrayClass
)[]

export const QueryArray = (arr: QueryArrayType) => {
    return new QueryArrayClass(arr)
}
