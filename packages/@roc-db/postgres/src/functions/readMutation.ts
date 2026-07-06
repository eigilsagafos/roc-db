import { idFromRef, type ReadMutationFunction, type Ref } from "roc-db"
import type { PostgresTxnEngine } from "../types/PostgresEngineOpts"
import { postgresRowToMutation } from "../lib/postgresRowToMutation"

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Mutation | null` alias return directly. Params are typed
// manually and the value is cast to the alias for the AdapterFunctions check.
export const readMutation: ReadMutationFunction = (async (
    engineOpts: PostgresTxnEngine,
    ref: Ref,
) => {
    const { mutationsTableName, sqlTxn } = engineOpts
    const id = idFromRef(ref)
    const [row] = await sqlTxn`
        SELECT * FROM ${sqlTxn(mutationsTableName)} WHERE id = ${id};
    `.catch((err: any) => {
        console.error("readMutation failed")
        throw err
    })
    if (!row) return
    return postgresRowToMutation(row)
}) as unknown as ReadMutationFunction
