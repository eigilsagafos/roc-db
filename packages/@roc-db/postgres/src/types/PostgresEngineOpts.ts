import type { Sql } from "postgres"

export type PostgresEngineOpts = {
    mutationsTableName: string
    entitiesTableName: string
    client: Sql
}
