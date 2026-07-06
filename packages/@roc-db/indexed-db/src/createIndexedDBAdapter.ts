import { createAdapter, Snowflake, type Adapter } from "roc-db"
import * as functions from "./functions"

export const createIndexedDBAdapter = ({
    operations,
    entities,
    session,
    dbName = "roc-db",
    optimistic = false,
    snowflake = new Snowflake(1, 1),
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
