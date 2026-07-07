import { entityFromRef, idFromRef } from "roc-db"
import type { PageMutationsFunction } from "roc-db"
import type {
    PostgresEngineOpts,
    PostgresTxnEngine,
} from "../types/PostgresEngineOpts"
import { postgresRowToMutation } from "../lib/postgresRowToMutation"

export const pageMutations: PageMutationsFunction<PostgresEngineOpts> = async (
    txn,
    args = {},
) => {
    const { size = null, skip, changeSetRef } = args
    const { mutationsTableName, sqlTxn } = txn.engineOpts as PostgresTxnEngine

    const changeSetId = changeSetRef ? idFromRef(changeSetRef) : null
    const changeSetKind = changeSetRef ? entityFromRef(changeSetRef) : null

    const rows = await sqlTxn`
        SELECT * FROM ${sqlTxn(mutationsTableName)} 
        WHERE
        ${changeSetId ? sqlTxn`change_set_id = ${changeSetId}` : sqlTxn`TRUE`}
        ${changeSetKind ? sqlTxn`AND change_set_kind = ${changeSetKind}` : sqlTxn``}
        ORDER BY timestamp DESC
        LIMIT ${size};
    `.catch((err: any) => {
        console.error("pageMutations failed")
        throw err
    })

    return rows.values().toArray().map(postgresRowToMutation)
}
