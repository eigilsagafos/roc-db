import { QueryBaseClass } from "./QueryBaseClass";
import type { QueryChainClass } from "./QueryChainClass";
import type { QueryClass } from "./QueryClass";

export class QueryObjectClass<T extends Record<string, unknown> = Record<string, unknown>> extends QueryBaseClass {
    map: { [key: string]: QueryChainClass<any> | QueryClass<any, any>; };
    constructor(map: {
        [key: string]: QueryChainClass<any> | QueryClass<any, any>;
      }) {
        super()
        this.map = map;
    }
}