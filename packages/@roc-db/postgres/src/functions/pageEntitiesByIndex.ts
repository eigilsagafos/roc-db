import { idFromRef } from "roc-db"
import type { PageEntitiesByIndexFunction } from "roc-db"
import type {
    PostgresEngineOpts,
    PostgresTxnEngine,
} from "../types/PostgresEngineOpts"
import { postgresRowToEntity } from "../lib/postgresRowToEntity"

export const pageEntitiesByIndex: PageEntitiesByIndexFunction<
    PostgresEngineOpts
> = async (txn, entity, field, value) => {
    const { entitiesTableName, sqlTxn } = txn.engineOpts as PostgresTxnEngine
    const entry = `${field}:${JSON.stringify(value)}`

    const rows = await sqlTxn`
        SELECT * FROM ${sqlTxn(entitiesTableName)}
        WHERE
        kind = ${entity} AND
        index_entries @> ARRAY[${entry}];
    `.catch((err: any) => {
        console.error("pageEntitiesByIndex failed")
        throw err
    })
    return rows.values().toArray().map(postgresRowToEntity)
}
