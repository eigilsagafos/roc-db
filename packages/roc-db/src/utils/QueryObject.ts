import type { QueryArrayClass } from "./QueryArrayClass"
import type { QueryChainClass } from "./QueryChainClass"
import type { QueryClass } from "./QueryClass"
import { QueryObjectClass } from "./QueryObjectClass"

type JSON =
    | string
    | number
    | boolean
    | null
    | { [property in string]: JSON }
    | JSON[]

type QueryMapObject = {
    [key: string]:
        | QueryChainClass<any>
        | QueryClass<any, any>
        | QueryArrayClass
        | QueryObjectClass
        | JSON
    // | QueryArray<any>
    // | JSON
}

export const QueryObject = (obj: QueryMapObject) => {
    return new QueryObjectClass(obj)
}
