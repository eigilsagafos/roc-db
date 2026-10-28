import { entityFromRef, idFromRef } from "roc-db"
import type { FindRecentMutationsFunction, RecentMutationsQuery } from "roc-db"
import type { PostgresTxnEngine } from "../types/PostgresEngineOpts"
import { postgresRowToMutation } from "../lib/postgresRowToMutation"

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Mutation[]` alias return directly. Params are typed manually and
// the value is cast to the alias for the AdapterFunctions check.
//
// The scope conditions are served by the indexes in mutationsTableIndexes.
export const findRecentMutations: FindRecentMutationsFunction = (async (
    engineOpts: PostgresTxnEngine,
    {
        changeSetRef,
        identityRef,
        since,
        scopeMutations,
        identityMutations,
    }: RecentMutationsQuery,
) => {
    const { sqlTxn, mutationsTableName } = engineOpts
    const afterSince = sqlTxn`(timestamp > ${since} OR persisted_at > ${since})`
    const conditions = []
    if (scopeMutations !== false) {
        conditions.push(
            changeSetRef
                ? sqlTxn`(change_set_id = ${idFromRef(changeSetRef)} AND change_set_kind = ${entityFromRef(changeSetRef)} AND ${afterSince})`
                : sqlTxn`(change_set_id IS NULL AND ${afterSince})`,
        )
    }
    if (identityMutations === undefined) {
        conditions.push(
            sqlTxn`(identity_ref = ${identityRef} AND ${afterSince})`,
        )
    } else if (identityMutations === "anywhere") {
        conditions.push(
            sqlTxn`(identity_ref = ${identityRef} AND timestamp > ${since})`,
        )
    }
    if (!conditions.length) return []
    const where = conditions.reduce(
        (combined, condition) => sqlTxn`${combined} OR ${condition}`,
    )
    const rows = await sqlTxn`
        SELECT * FROM ${sqlTxn(mutationsTableName)} WHERE ${where}
    `.catch((err: any) => {
        console.error("findRecentMutations failed")
        throw err
    })
    return rows.map(postgresRowToMutation)
}) as unknown as FindRecentMutationsFunction
