import {
    createAdapter,
    type CreateAdapterOptions,
    Snowflake,
    type Operation,
} from "roc-db"
import * as functions from "./functions"

export const createIndexedDBAdapter = <
    const Operations extends readonly Operation[],
>({
    operations,
    entities,
    session,
    dbName = "roc-db",
    optimistic = false,
}: CreateAdapterOptions<Operations> & { dbName?: string }) => {
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
