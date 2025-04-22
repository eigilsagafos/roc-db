import {
    createAdapter,
    Snowflake,
    type Adapter,
    type Entity,
    type Operation,
} from "roc-db"
import * as functions from "./functions"
import type { PostgresEngineOpts } from "./types/PostgresEngineOpts"

export const createPostgresAdapter = ({
    operations,
    entities,
    client,
    getClient,
    session,
    mutationsTableName = "mutations",
    entitiesTableName = "entities",
    optimistic = false,
    beforeTransactionStart,
    afterTransactionEnd,
    onTransactionStart,
    onTransactionEnd,
    snowflake = new Snowflake(1, 1),
}: {
    operations: readonly Operation[]
    entities: readonly Entity[]
    getClient?: any
} & PostgresEngineOpts) => {
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
            beforeTransactionStart,
            afterTransactionEnd,
            onTransactionStart,
            onTransactionEnd,
        },
    ) as Adapter
}
