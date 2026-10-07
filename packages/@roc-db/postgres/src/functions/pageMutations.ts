import { idFromRef, normalizePageMutationsArgs } from "roc-db"
import type { NormalizedPageMutationsArgs, PageMutationsFunction } from "roc-db"
import type {
    PostgresEngineOpts,
    PostgresTxnEngine,
} from "../types/PostgresEngineOpts"
import { postgresRowToMutation } from "../lib/postgresRowToMutation"
import { createMutationFilterClause } from "./mutationFilterClauses"

// Keyset cursor. `id` is a snowflake stored as text and its decimal length
// grows over time, so a text comparison would misorder ids across a
// digit-count boundary — compare numerically, as `sortMutations` does in JS.
const createBeforeClause = (
    before: NormalizedPageMutationsArgs["before"],
    sqlTxn: any,
) => {
    if (!before) return sqlTxn`TRUE`
    const timestamp = new Date(before.timestamp)
    if (!before.ref) return sqlTxn`timestamp < ${timestamp}`
    const id = idFromRef(before.ref) as string
    return sqlTxn`(
        timestamp < ${timestamp}
        OR (timestamp = ${timestamp} AND id::numeric < ${id}::numeric)
    )`
}

export const pageMutations: PageMutationsFunction<PostgresEngineOpts> = (async (
    txn: any,
    args: any,
) => {
    const normalized = normalizePageMutationsArgs(args)
    const { mutationsTableName, sqlTxn } = txn.engineOpts as PostgresTxnEngine

    const rows = await sqlTxn`
        SELECT * FROM ${sqlTxn(mutationsTableName)}
        WHERE
        ${createMutationFilterClause(normalized, sqlTxn)}
        AND ${createBeforeClause(normalized.before, sqlTxn)}
        -- The id tiebreak makes the order total: timestamps are
        -- millisecond-precision, so a burst of writes ties and keyset paging
        -- would otherwise drop or repeat rows at a page boundary.
        ORDER BY timestamp DESC, id::numeric DESC
        LIMIT ${normalized.size};
    `.catch((err: any) => {
        console.error("pageMutations failed")
        throw err
    })

    return rows.values().toArray().map(postgresRowToMutation)
}) as unknown as PageMutationsFunction<PostgresEngineOpts>
