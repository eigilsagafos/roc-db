import { createAdapter, Snowflake, type Operation } from "roc-db"
import * as functions from "./functions"

export const createIndexedDBAdapter = <
    const Operations extends readonly Operation[],
>({
    operations,
    entities,
    session,
    dbName = "roc-db",
    optimistic = false,
}: {
    operations: Operations
    entities: readonly any[]
    session: any
    dbName?: string
    optimistic?: boolean
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
    )
}
