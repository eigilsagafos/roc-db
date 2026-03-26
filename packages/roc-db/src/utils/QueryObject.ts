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

type UnwrapQueryValue<T> = T extends QueryChainClass<infer O>
    ? O
    : T extends QueryClass<any, infer O>
      ? O
      : T extends QueryObjectClass<infer O>
        ? O
        : T extends QueryArrayClass<infer O>
          ? O
          : T

type UnwrapQueryMap<T extends Record<string, unknown>> = {
    [K in keyof T]: UnwrapQueryValue<T[K]>
}

type QueryMapObject = {
    [key: string]:
        | QueryChainClass<any>
        | QueryClass<any, any>
        | QueryArrayClass
        | QueryObjectClass
        | JSON
}

export const QueryObject = <T extends Record<string, unknown>>(obj: T) => {
    return new QueryObjectClass<UnwrapQueryMap<T>>(obj as any)
}
