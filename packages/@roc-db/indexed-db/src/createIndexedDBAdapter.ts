import {
    createAdapter,
    Snowflake,
    type Adapter,
    type Entity,
    type Operation,
} from "roc-db"
import * as functions from "./functions"

export const createIndexedDBAdapter = ({
    operations,
    entities,
    session,
    dbName = "roc-db",
    optimistic = false,
    snowflake = new Snowflake(1, 1),
}: {
    operations: readonly Operation[]
    entities: readonly Entity<any>[]
    session: { identityRef: string; sessionRef?: string }
    dbName?: string
    optimistic?: boolean
    snowflake?: Snowflake
}) => {
    return createAdapter(
        {
            name: "indexed-db",
            operations,
            entities,
            functions,
            optimistic,
            session,
            snowflake,
            async: true,
        },
        {
            dbName,
            version: 1,
        },
    ) as Adapter
}
