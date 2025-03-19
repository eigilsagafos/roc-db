import {
    createAdapter,
    Snowflake,
    type Adapter,
    type Entity,
    type Operation,
} from "roc-db"
import * as functions from "./functions"

export const createPostgresAdapter = ({
    operations,
    entities,
    client,
    getClient,
    session,
    mutationsTableName = "mutations",
    entitiesTableName = "entities",
}: {
    operations: readonly Operation[]
    entities: readonly Entity[]
    client: any
    getClient?: any
    mutationsTableName?: string
    entitiesTableName?: string
}) => {
    return createAdapter(
        {
            name: "postgres",
            operations,
            entities,
            functions,
            session,
            snowflake: new Snowflake(1, 1),
            async: true,
        },
        {
            client,
            getClient,
            mutationsTableName,
            entitiesTableName,
        },
    ) as Adapter
}
