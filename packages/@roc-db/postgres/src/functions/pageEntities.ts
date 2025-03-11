import { postgresRowToEntity } from "../lib/postgresRowToEntity"

export const pageEntities = async (txn, args) => {
    const { entitiesTableName, sqlTxn } = txn.engineOpts
    const rows = await sqlTxn`
        SELECT * FROM ${sqlTxn(entitiesTableName)} ;
    `
    return rows.values().toArray().map(postgresRowToEntity)
}
