import {
    createAdapter,
    type CreateAdapterOptions,
    type EntityN,
    Snowflake,
    type Operation,
} from "roc-db"
import * as functions from "./functions"

export const createInMemoryAdapter = <
    const Operations extends readonly Operation[],
    const Entities extends readonly EntityN[],
>({
    operations,
    entities,
    snowflake = new Snowflake(1, 1),
    optimistic = true,
    session,
}: CreateAdapterOptions<Operations, Entities>) => {
    return createAdapter(
        {
            name: "in-memory",
            operations,
            entities,
            functions,
            snowflake,
            optimistic,
            session,
        },
        {
            entities: new Map(),
            mutations: new Map(),
            entitiesUnique: new Map(),
            entitiesIndex: new Map(),
        },
    )
}
