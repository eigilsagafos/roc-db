import type { Ref, RefByUniqueFieldFunction } from "roc-db"
import type { PostgresTxnEngine } from "../types/PostgresEngineOpts"
import type { PostgresQueryTransaction } from "../types/PostgresQueryTransaction"

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Ref | null` alias return directly. Params are typed manually and
// the value is cast to the alias for the AdapterFunctions check.
export const refByUniqueField: RefByUniqueFieldFunction = (async (
    txn: PostgresQueryTransaction,
    entity: string,
    field: string,
    fieldIndex: number,
    value: any,
) => {
    const uniqueColumn = `unique_constraint_${fieldIndex}`
    const uniqueValue = `${field}:${JSON.stringify(value)}`
    const { entitiesTableName, sqlTxn } = txn.engineOpts as PostgresTxnEngine
    const [row] = await sqlTxn`
        SELECT id, kind FROM ${sqlTxn(entitiesTableName)} WHERE kind = ${entity} AND ${sqlTxn(uniqueColumn)} = ${uniqueValue} LIMIT 1;
    `
    if (!row) return undefined
    return `${row.kind}/${row.id}` as Ref
}) as unknown as RefByUniqueFieldFunction
