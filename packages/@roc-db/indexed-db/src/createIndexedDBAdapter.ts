import { createAdapter, Snowflake } from "roc-db"
import * as functions from "./functions"

export const createIndexedDBAdapter = ({
    operations,
    entities,
    session,
    dbName = "roc-db",
    optimistic = false,
}) => {
    return createAdapter(
        {
            name: "indexed-db",
            operations,
            entities,
            functions,
            optimistic,
            session,
            snowflake: new Snowflake(1, 1),
            async: true,
        },
        {
            dbName,
            version: 1,
        },
    ) as Adapter
}
