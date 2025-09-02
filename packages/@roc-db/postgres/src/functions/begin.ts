import type { Sql } from "postgres"
import type { PostgresEngineOpts } from "../types/PostgresEngineOpts"

const findClient = (engineOpts: PostgresEngineOpts): Sql => {
    if (engineOpts.client) return engineOpts.client
    if (engineOpts.getClient) return engineOpts.getClient()
    throw new Error("No client found")
}
export const begin = async (engineOpts: PostgresEngineOpts, callback) => {
    const rootClient = findClient(engineOpts)
    return rootClient.begin(async tx => {
        if (engineOpts.onTransactionStart) {
            await engineOpts.onTransactionStart(tx)
        }
        return callback({
            ...engineOpts,
            sqlClient: rootClient,
            sqlTxn: tx,
        }).finally(async () => {
            if (engineOpts.onTransactionEnd) {
                await engineOpts.onTransactionEnd(tx)
            }
        })
    })
}
