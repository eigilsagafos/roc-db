import { DELETED_IN_CHANGE_SET_SYMBOL, idFromRef, type Ref } from "roc-db"
import type { PostgresTransaction } from "../types/PostgresTransaction"
import { postgresRowToEntity } from "../lib/postgresRowToEntity"

export const readEntity = async (txn: PostgresTransaction, ref: Ref) => {
    if (txn.request.changeSetRef) {
        const doc = txn.engineOpts.changeSet.entities.get(ref)
        if (doc === DELETED_IN_CHANGE_SET_SYMBOL) return undefined
        if (doc) return doc
    }
    if (txn.engineOpts.uncommitted[ref]) {
        const [action, doc] = txn.db.uncommitted[ref]
        if (action === "delete") return undefined
        return doc
    }
    const id = idFromRef(ref)
    const { entitiesTableName, sqlTxn } = txn.engineOpts
    const [row] = await sqlTxn`
        SELECT * FROM ${sqlTxn(entitiesTableName)} WHERE id = ${id};
    `
    return postgresRowToEntity(row)
}
