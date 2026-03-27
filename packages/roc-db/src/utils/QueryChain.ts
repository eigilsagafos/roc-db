import type { QueryArrayClass } from "./QueryArrayClass"
import { QueryChainClass } from "./QueryChainClass"
import { QueryClass } from "./QueryClass"
import type { QueryObjectClass } from "./QueryObjectClass"

type AnyQuery<I extends any[], O> =
    | QueryClass<I, O>
    | QueryChainClass<O>
    | QueryObjectClass<O & Record<string, unknown>>
    | QueryArrayClass<O>
    | undefined

type UnwrapInner<T> = T extends QueryObjectClass<infer O>
    ? O
    : T extends QueryArrayClass<infer O>
      ? O
      : T extends QueryChainClass<infer O>
        ? O
        : T

type UnwrapOutput<O> = O extends QueryClass<any[], infer T>
    ? UnwrapInner<T>
    : O extends QueryObjectClass<infer T>
      ? T
      : O extends QueryArrayClass<infer T>
        ? T
        : O extends QueryChainClass<infer T>
          ? T
          : O

type QueryChainFn = {
    // 1 query
    <O1>(q1: AnyQuery<[], O1>): QueryChainClass<UnwrapOutput<O1>>
    // 2 queries
    <O1, O2>(
        q1: AnyQuery<[], O1>,
        q2: AnyQuery<[UnwrapOutput<O1>], O2>,
    ): QueryChainClass<UnwrapOutput<O2>>
    // 3 queries
    <O1, O2, O3>(
        q1: AnyQuery<[], O1>,
        q2: AnyQuery<[UnwrapOutput<O1>], O2>,
        q3: AnyQuery<[UnwrapOutput<O2>, UnwrapOutput<O1>], O3>,
    ): QueryChainClass<UnwrapOutput<O3>>
    // 4 queries
    <O1, O2, O3, O4>(
        q1: AnyQuery<[], O1>,
        q2: AnyQuery<[UnwrapOutput<O1>], O2>,
        q3: AnyQuery<[UnwrapOutput<O2>, UnwrapOutput<O1>], O3>,
        q4: AnyQuery<
            [UnwrapOutput<O3>, UnwrapOutput<O2>, UnwrapOutput<O1>],
            O4
        >,
    ): QueryChainClass<UnwrapOutput<O4>>
    // 5 queries
    <O1, O2, O3, O4, O5>(
        q1: AnyQuery<[], O1>,
        q2: AnyQuery<[UnwrapOutput<O1>], O2>,
        q3: AnyQuery<[UnwrapOutput<O2>, UnwrapOutput<O1>], O3>,
        q4: AnyQuery<
            [UnwrapOutput<O3>, UnwrapOutput<O2>, UnwrapOutput<O1>],
            O4
        >,
        q5: AnyQuery<
            [
                UnwrapOutput<O4>,
                UnwrapOutput<O3>,
                UnwrapOutput<O2>,
                UnwrapOutput<O1>,
            ],
            O5
        >,
    ): QueryChainClass<UnwrapOutput<O5>>
    // 6 queries
    <O1, O2, O3, O4, O5, O6>(
        q1: AnyQuery<[], O1>,
        q2: AnyQuery<[UnwrapOutput<O1>], O2>,
        q3: AnyQuery<[UnwrapOutput<O2>, UnwrapOutput<O1>], O3>,
        q4: AnyQuery<
            [UnwrapOutput<O3>, UnwrapOutput<O2>, UnwrapOutput<O1>],
            O4
        >,
        q5: AnyQuery<
            [
                UnwrapOutput<O4>,
                UnwrapOutput<O3>,
                UnwrapOutput<O2>,
                UnwrapOutput<O1>,
            ],
            O5
        >,
        q6: AnyQuery<
            [
                UnwrapOutput<O5>,
                UnwrapOutput<O4>,
                UnwrapOutput<O3>,
                UnwrapOutput<O2>,
                UnwrapOutput<O1>,
            ],
            O6
        >,
    ): QueryChainClass<UnwrapOutput<O6>>
    // 7 queries
    <O1, O2, O3, O4, O5, O6, O7>(
        q1: AnyQuery<[], O1>,
        q2: AnyQuery<[UnwrapOutput<O1>], O2>,
        q3: AnyQuery<[UnwrapOutput<O2>, UnwrapOutput<O1>], O3>,
        q4: AnyQuery<
            [UnwrapOutput<O3>, UnwrapOutput<O2>, UnwrapOutput<O1>],
            O4
        >,
        q5: AnyQuery<
            [
                UnwrapOutput<O4>,
                UnwrapOutput<O3>,
                UnwrapOutput<O2>,
                UnwrapOutput<O1>,
            ],
            O5
        >,
        q6: AnyQuery<
            [
                UnwrapOutput<O5>,
                UnwrapOutput<O4>,
                UnwrapOutput<O3>,
                UnwrapOutput<O2>,
                UnwrapOutput<O1>,
            ],
            O6
        >,
        q7: AnyQuery<
            [
                UnwrapOutput<O6>,
                UnwrapOutput<O5>,
                UnwrapOutput<O4>,
                UnwrapOutput<O3>,
                UnwrapOutput<O2>,
                UnwrapOutput<O1>,
            ],
            O7
        >,
    ): QueryChainClass<UnwrapOutput<O7>>
    // 8 queries
    <O1, O2, O3, O4, O5, O6, O7, O8>(
        q1: AnyQuery<[], O1>,
        q2: AnyQuery<[UnwrapOutput<O1>], O2>,
        q3: AnyQuery<[UnwrapOutput<O2>, UnwrapOutput<O1>], O3>,
        q4: AnyQuery<
            [UnwrapOutput<O3>, UnwrapOutput<O2>, UnwrapOutput<O1>],
            O4
        >,
        q5: AnyQuery<
            [
                UnwrapOutput<O4>,
                UnwrapOutput<O3>,
                UnwrapOutput<O2>,
                UnwrapOutput<O1>,
            ],
            O5
        >,
        q6: AnyQuery<
            [
                UnwrapOutput<O5>,
                UnwrapOutput<O4>,
                UnwrapOutput<O3>,
                UnwrapOutput<O2>,
                UnwrapOutput<O1>,
            ],
            O6
        >,
        q7: AnyQuery<
            [
                UnwrapOutput<O6>,
                UnwrapOutput<O5>,
                UnwrapOutput<O4>,
                UnwrapOutput<O3>,
                UnwrapOutput<O2>,
                UnwrapOutput<O1>,
            ],
            O7
        >,
        q8: AnyQuery<
            [
                UnwrapOutput<O7>,
                UnwrapOutput<O6>,
                UnwrapOutput<O5>,
                UnwrapOutput<O4>,
                UnwrapOutput<O3>,
                UnwrapOutput<O2>,
                UnwrapOutput<O1>,
            ],
            O8
        >,
    ): QueryChainClass<UnwrapOutput<O8>>
    // spread array fallback
    (...queries: AnyQuery<any[], any>[]): QueryChainClass<any>
}

export const QueryChain: QueryChainFn = (
    ...queries: any[]
): QueryChainClass<any> => {
    return new QueryChainClass(queries)
}
