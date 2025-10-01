import { postgresRowToMutation } from "../lib/postgresRowToMutation"
import { parseRef } from "roc-db"
import type { PostgresTransaction } from "../types/PostgresTransaction"

export const getChangeSetMutations = async (
    txn: PostgresTransaction,
    changeSetRef,
) => {
    const [id, entity] = parseRef(changeSetRef)
    const { mutationsTableName, sqlTxn } = txn.engineOpts
    const res = await sqlTxn`
        SELECT * FROM ${sqlTxn(mutationsTableName)}
        WHERE 
            change_set_id = ${id} AND 
            change_set_kind = ${entity}
        ORDER BY id ASC;
    `.catch(err => {
        console.error("getChangeSetMutations failed")
        throw err
    })
    return res.values().toArray().map(postgresRowToMutation)
}
