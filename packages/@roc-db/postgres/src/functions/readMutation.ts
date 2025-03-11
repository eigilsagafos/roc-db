import { idFromRef } from "roc-db"
import { postgresRowToMutation } from "../lib/postgresRowToMutation"

export const readMutation = async (engineOpts, ref) => {
    const { mutationsTableName, sqlTxn } = engineOpts
    const id = idFromRef(ref)
    const [row] = await sqlTxn`
        SELECT * FROM ${sqlTxn(mutationsTableName)} WHERE id = ${id};
    `
    if (!row) return
    return postgresRowToMutation(row)
}
