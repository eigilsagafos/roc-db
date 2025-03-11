import { idFromRef } from "roc-db"

export const commitDelete = (txn, table, entity: any) => {
    const id = idFromRef(entity.ref)
    return txn`
        DELETE FROM ${txn(table)} 
        WHERE id = ${id}
        RETURNING id;
    `.catch(e => {
        console.error("Error deleting entity")
        throw e
    })
}
