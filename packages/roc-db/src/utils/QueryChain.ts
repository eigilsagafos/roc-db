import { QueryChainClass } from "./QueryChainClass"
import { QueryClass } from "./QueryClass"

type QueryChainFn = {
    // 1 query
    <O1>(q1: QueryClass<[], O1>): QueryChainClass<O1>
    // 2 queries
    <O1, O2>(
        q1: QueryClass<[], O1>,
        q2: QueryClass<[O1], O2>,
    ): QueryChainClass<O2>
    // 3 queries
    <O1, O2, O3>(
        q1: QueryClass<[], O1>,
        q2: QueryClass<[O1], O2>,
        q3: QueryClass<[O2, O1], O3>,
    ): QueryChainClass<O3>
    // 4 queries
    <O1, O2, O3, O4>(
        q1: QueryClass<[], O1>,
        q2: QueryClass<[O1], O2>,
        q3: QueryClass<[O2, O1], O3>,
        q4: QueryClass<[O3, O2, O1], O4>,
    ): QueryChainClass<O4>
    // 5 queries
    <O1, O2, O3, O4, O5>(
        q1: QueryClass<[], O1>,
        q2: QueryClass<[O1], O2>,
        q3: QueryClass<[O2, O1], O3>,
        q4: QueryClass<[O3, O2, O1], O4>,
        q5: QueryClass<[O4, O3, O2, O1], O5>,
    ): QueryChainClass<O5>
    // 6 queries
    <O1, O2, O3, O4, O5, O6>(
        q1: QueryClass<[], O1>,
        q2: QueryClass<[O1], O2>,
        q3: QueryClass<[O2, O1], O3>,
        q4: QueryClass<[O3, O2, O1], O4>,
        q5: QueryClass<[O4, O3, O2, O1], O5>,
        q6: QueryClass<[O6, O4, O3, O2, O1], O6>,
    ): QueryChainClass<O6>
    // 7 queries
    <O1, O2, O3, O4, O5, O6, O7>(
        q1: QueryClass<[], O1>,
        q2: QueryClass<[O1], O2>,
        q3: QueryClass<[O2, O1], O3>,
        q4: QueryClass<[O3, O2, O1], O4>,
        q5: QueryClass<[O4, O3, O2, O1], O5>,
        q6: QueryClass<[O5, O4, O3, O2, O1], O6>,
        q7: QueryClass<[O6, O5, O4, O3, O2, O1], O7>,
    ): QueryChainClass<O7>
    // 8 queries
    <O1, O2, O3, O4, O5, O6, O7, O8>(
        q1: QueryClass<[], O1>,
        q2: QueryClass<[O1], O2>,
        q3: QueryClass<[O2, O1], O3>,
        q4: QueryClass<[O3, O2, O1], O4>,
        q5: QueryClass<[O4, O3, O2, O1], O5>,
        q6: QueryClass<[O5, O4, O3, O2, O1], O6>,
        q7: QueryClass<[O6, O5, O4, O3, O2, O1], O7>,
        q8: QueryClass<[O7, O6, O5, O4, O3, O2, O1], O8>,
    ): QueryChainClass<O8>
}

export const QueryChain: QueryChainFn = (
    ...queries: any[]
): QueryChainClass<any> => {
    return new QueryChainClass(queries)
}
