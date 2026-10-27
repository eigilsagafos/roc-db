import {
    createAdapter,
    Snowflake,
    type Adapter,
    type Entity,
    type Operation,
    type ReplayDivergenceConfig,
} from "roc-db"
import * as functions from "./functions"

export const createIndexedDBAdapter = ({
    operations,
    entities,
    session,
    dbName = "roc-db",
    optimistic = false,
    snowflake = new Snowflake(1, 1),
    replayDivergence,
}: {
    operations: readonly Operation[]
    entities: readonly Entity<any>[]
    session: { identityRef: string; sessionRef?: string }
    dbName?: string
    optimistic?: boolean
    snowflake?: Snowflake
    replayDivergence?: ReplayDivergenceConfig
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
            replayDivergence,
        },
        {
            dbName,
            version: 1,
        },
    ) as Adapter
}
