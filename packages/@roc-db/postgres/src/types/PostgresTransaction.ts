import type { PostgresMutationTransaction } from "./PostgresMutationTransaction"
import type { PostgresQueryTransaction } from "./PostgresQueryTransaction"

export type PostgresTransaction =
    | PostgresMutationTransaction
    | PostgresQueryTransaction
