import type { QueryChainClass } from "./QueryChainClass";
import type { QueryClass } from "./QueryClass";
import { QueryObjectClass } from "./QueryObjectClass";

type QueryMapObject = { [key: string]: QueryChainClass<any> | QueryClass<any, any>; }

export const QueryObject = (obj: QueryMapObject) => {
    return new QueryObjectClass(obj);
}