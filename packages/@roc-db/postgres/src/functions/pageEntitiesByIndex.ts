import { idFromRef } from "roc-db"
import { postgresRowToEntity } from "../lib/postgresRowToEntity"

export const pageEntitiesByIndex = async (txn, entity, field, value) => {
    const { entitiesTableName, sqlTxn } = txn.engineOpts
    const entry = `${field}:${JSON.stringify(value)}`

    const rows = await sqlTxn`
        SELECT * FROM ${sqlTxn(entitiesTableName)}
        WHERE
        kind = ${entity} AND
        index_entries @> ARRAY[${entry}];
    `.catch(err => {
        console.error("pageEntitiesByIndex failed")
        throw err
    })
    return rows.values().toArray().map(postgresRowToEntity)
}
