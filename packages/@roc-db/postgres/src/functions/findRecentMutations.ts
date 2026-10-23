import { entityFromRef, idFromRef } from "roc-db"
import type { FindRecentMutationsFunction, RecentMutationsQuery } from "roc-db"
import type { PostgresTxnEngine } from "../types/PostgresEngineOpts"
import { postgresRowToMutation } from "../lib/postgresRowToMutation"

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Mutation[]` alias return directly. Params are typed manually and
// the value is cast to the alias for the AdapterFunctions check.
export const findRecentMutations: FindRecentMutationsFunction = (async (
    engineOpts: PostgresTxnEngine,
    { changeSetRef, identityRef, since }: RecentMutationsQuery,
) => {
    const { sqlTxn, mutationsTableName } = engineOpts
    const changeSetFilter = changeSetRef
        ? sqlTxn`change_set_id = ${idFromRef(changeSetRef)} AND change_set_kind = ${entityFromRef(changeSetRef)}`
        : sqlTxn`change_set_id IS NULL`
    const rows = await sqlTxn`
        SELECT * FROM ${sqlTxn(mutationsTableName)}
        WHERE
            (timestamp > ${since} OR persisted_at > ${since}) AND
            ((${changeSetFilter}) OR identity_ref = ${identityRef})
    `.catch((err: any) => {
        console.error("findRecentMutations failed")
        throw err
    })
    return rows.map(postgresRowToMutation)
}) as unknown as FindRecentMutationsFunction
