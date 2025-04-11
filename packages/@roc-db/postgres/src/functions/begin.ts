import type { Sql } from "postgres"
import type { PostgresEngineOpts } from "../types/PostgresEngineOpts"

const findClient = (engineOpts: PostgresEngineOpts): Sql => {
    if (engineOpts.client) return engineOpts.client
    if (engineOpts.getClient) return engineOpts.getClient()
    throw new Error("No client found")
}
export const begin = async (engineOpts: PostgresEngineOpts, callback) => {
    const rootClient = findClient(engineOpts)
    if (engineOpts.beforeTransactionStart) {
        await engineOpts.beforeTransactionStart(rootClient)
    }
    const res = await rootClient.begin(async tx => {
        if (engineOpts.onTransactionStart) {
            await engineOpts.onTransactionStart(tx)
        }
        return callback({
            ...engineOpts,
            sqlClient: rootClient,
            sqlTxn: tx,
        })
    })
    if (engineOpts.afterTransactionEnd) {
        await engineOpts.afterTransactionEnd(rootClient)
    }
    return res
}
