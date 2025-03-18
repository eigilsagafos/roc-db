import { QueryBaseClass } from "./QueryBaseClass";
import type { QueryChainClass } from "./QueryChainClass";
import type { QueryClass } from "./QueryClass";

type QueryMapObject = { [key: string]: QueryChainClass<any> | QueryClass<any, any>; }

export class QueryObjectClass extends QueryBaseClass {
    map: { [key: string]: QueryChainClass<any> | QueryClass<any, any>; };
    constructor(map: {
        [key: string]: QueryChainClass<any> | QueryClass<any, any>;
      }) {
        super()
        this.map = map;
    }
}