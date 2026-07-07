import { entityFromRef, idFromRef, type ReadEntityFunctiun } from "roc-db"
import { postgresRowToEntity } from "../lib/postgresRowToEntity"
import type {
    PostgresEngineOpts,
    PostgresTxnEngine,
} from "../types/PostgresEngineOpts"

export const readEntity: ReadEntityFunctiun<PostgresEngineOpts> = async (
    txn,
    ref,
) => {
    const id = idFromRef(ref) ?? `_${entityFromRef(ref)}`
    const { entitiesTableName, sqlTxn } = txn.engineOpts as PostgresTxnEngine
    const [row] = await sqlTxn`
        SELECT * FROM ${sqlTxn(entitiesTableName)} WHERE id = ${id};
    `.catch((err: any) => {
        console.error("readEntity failed")
        throw err
    })
    if (!row) return undefined
    return postgresRowToEntity(row)
}
