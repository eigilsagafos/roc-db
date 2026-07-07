import { postgresRowToMutation } from "../lib/postgresRowToMutation"
import { parseRef, type GetChangeSetMutationsFunction, type Ref } from "roc-db"
import type { PostgresTxnEngine } from "../types/PostgresEngineOpts"
import type { PostgresQueryTransaction } from "../types/PostgresQueryTransaction"

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Mutation[]` alias return directly. Params are typed manually and
// the value is cast to the alias for the AdapterFunctions check.
export const getChangeSetMutations: GetChangeSetMutationsFunction = (async (
    txn: PostgresQueryTransaction,
    changeSetRef: Ref,
) => {
    const [id, entity] = parseRef(changeSetRef)
    const { mutationsTableName, sqlTxn } = txn.engineOpts as PostgresTxnEngine
    const res = await sqlTxn`
        SELECT * FROM ${sqlTxn(mutationsTableName)}
        WHERE
            change_set_id = ${id} AND
            change_set_kind = ${entity}
        ORDER BY id ASC;
    `.catch((err: any) => {
        console.error("getChangeSetMutations failed")
        throw err
    })
    return res.values().toArray().map(postgresRowToMutation)
}) as unknown as GetChangeSetMutationsFunction
