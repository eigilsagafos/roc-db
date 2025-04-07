import { idFromRef, type Ref } from "roc-db"
import type { PostgresMutationTransaction } from "../types/PostgresMutationTransaction"

export const commitDelete = async (
    txn: PostgresMutationTransaction,
    ref: Ref,
) => {
    const { sqlTxn, entitiesTableName } = txn.engineOpts
    const id = idFromRef(ref)
    return sqlTxn`
            DELETE FROM ${sqlTxn(entitiesTableName)} 
            WHERE id = ${id}
            RETURNING id;
        `.catch(e => {
        console.error("Error deleting entity")
        throw e
    })
}
