import {
    createAdapter,
    type CreateAdapterOptions,
    Snowflake,
    type Operation,
} from "roc-db"
import * as functions from "./functions"
import type { PostgresEngineOpts } from "./types/PostgresEngineOpts"

export const createPostgresAdapter = <
    const Operations extends readonly Operation[],
>({
    operations,
    entities,
    client,
    getClient,
    session,
    mutationsTableName = "mutations",
    entitiesTableName = "entities",
    optimistic = false,
    onTransactionStart,
    onTransactionEnd,
    snowflake = new Snowflake(1, 1),
}: CreateAdapterOptions<Operations> & PostgresEngineOpts & { getClient?: any }) => {
    return createAdapter(
        {
            name: "postgres",
            operations,
            entities,
            functions,
            optimistic,
            session,
            snowflake,
            async: true,
        },
        {
            client,
            getClient,
            mutationsTableName,
            entitiesTableName,
            onTransactionStart,
            onTransactionEnd,
        },
    )
}
