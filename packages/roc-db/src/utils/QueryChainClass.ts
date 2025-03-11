export class QueryChainClass<O> {
    constructor(public queries: any[]) {}
    execute(): O {
        throw new Error("Not implemented")
    }
}
