import { QueryBaseClass } from "./QueryBaseClass"

export class QueryChainClass<O> extends QueryBaseClass {
    constructor(public queries: any[]) {
        super()
    }
    execute(): O {
        throw new Error("Not implemented")
    }
}
