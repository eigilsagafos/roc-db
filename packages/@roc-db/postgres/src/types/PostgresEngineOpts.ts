import type { Sql, TransactionSql } from "postgres"

export type PostgresEngineOpts = {
    mutationsTableName: string
    entitiesTableName: string
    client: Sql
    onTransactionStart?: (txn: TransactionSql) => Promise<void>
    onTransactionEnd?: (txn: TransactionSql) => Promise<void>
}
