import { idFromRef, type Ref } from "roc-db"
import { postgresRowToEntity } from "../lib/postgresRowToEntity"
import type { PostgresTransaction } from "../types/PostgresTransaction"

export const readEntity = async (txn: PostgresTransaction, ref: Ref) => {
    const id = idFromRef(ref)
    const { entitiesTableName, sqlTxn } = txn.engineOpts
    const [row] = await sqlTxn`
        SELECT * FROM ${sqlTxn(entitiesTableName)} WHERE id = ${id};
    `
    if (!row) return undefined
    return postgresRowToEntity(row)
}
