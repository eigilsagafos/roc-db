import type { QueryArrayType } from "./QueryArray"
import { QueryBaseClass } from "./QueryBaseClass"

export class QueryArrayClass extends QueryBaseClass {
    array: QueryArrayType
    constructor(array: QueryArrayType) {
        super()
        this.array = array
    }
}
