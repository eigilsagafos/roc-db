import type { Ref } from "roc-db"
import type { PostgresTransaction } from "../types/PostgresTransaction"

export const refByUniqueField = async (
    txn: PostgresTransaction,
    entity: string,
    field: string,
    fieldIndex: number,
    value: string,
) => {
    const uniqueColumn = `unique_constraint_${fieldIndex}`
    const uniqueValue = `${field}:${JSON.stringify(value)}`
    const { entitiesTableName, sqlTxn } = txn.engineOpts
    const [row] = await sqlTxn`
        SELECT id, kind FROM ${sqlTxn(entitiesTableName)} WHERE kind = ${entity} AND ${sqlTxn(uniqueColumn)} = ${uniqueValue} LIMIT 1;
    `
    if (!row) return undefined
    return `${row.kind}/${row.id}` as Ref
}
