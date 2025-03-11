import type { Sql } from "postgres"
import type { PostgresEngineOpts } from "../types/PostgresEngineOpts"

const findClient = (engineOpts: PostgresEngineOpts): Sql => {
    if (engineOpts.client) return engineOpts.client
    if (engineOpts.getClient) return engineOpts.getClient()
    throw new Error("No client found")
}
export const begin = async (
    request,
    engineOpts: PostgresEngineOpts,
    callback,
) => {
    const rootClient = findClient(engineOpts)
    return rootClient.begin(async tx => {
        return callback({
            ...engineOpts,
            sqlClient: rootClient,
            sqlTxn: tx,
            uncommitted: {},
            changeSet: request.changeSetRef
                ? {
                      entities: new Map([]),
                      mutations: new Map([]),
                  }
                : null,
        })
    })
}
