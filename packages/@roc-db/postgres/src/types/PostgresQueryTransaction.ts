import type { QueryTransaction } from "roc-db"

export type PostgresQueryTransaction<ArgsSchema = any> = QueryTransaction<
    ArgsSchema,
    "postgres"
>
