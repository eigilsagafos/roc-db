import { entityFromRef, idFromRef, type Ref } from "roc-db"
import type { PostgresMutationTransaction } from "../types/PostgresMutationTransaction"

export const commitDelete = async (
    txn: PostgresMutationTransaction,
    ref: Ref,
) => {
    const { sqlTxn, entitiesTableName, mutationsTableName } = txn.engineOpts
    const id = idFromRef(ref)
    const entity = entityFromRef(ref)
    if (entity === "Mutation") {
        return sqlTxn`
                DELETE FROM ${sqlTxn(mutationsTableName)} 
                WHERE id = ${id}
                RETURNING id;
            `.catch(e => {
            console.error("Error deleting mutation")
            throw e
        })
    } else {
        return sqlTxn`
                DELETE FROM ${sqlTxn(entitiesTableName)} 
                WHERE id = ${id}
                RETURNING id;
            `.catch(e => {
            console.error("Error deleting entity")
            throw e
        })
    }
}
