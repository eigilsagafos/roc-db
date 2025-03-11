import type { MutationTransaction } from "roc-db"

export type PostgresMutationTransaction<OperationName extends string = any> =
    MutationTransaction<OperationName, "postgres">
