import { createAdapter, Snowflake, type Adapter, type Operation } from "roc-db"
import * as functions from "./functions"
import type { z } from "zod"

type Entity = z.ZodObject<{
    entity: z.ZodLiteral<string>
}>

export const createInMemoryAdapter = <
    const Name extends string,
    const Operations extends readonly Operation[],
    const Entities extends readonly Entity[],
>({
    operations,
    entities,
    snowflake = new Snowflake(1, 1),
    session,
    optimistic = true,
}: {
    operations: Operations
    entities: Entities
    snowflake?: Snowflake
}) => {
    return createAdapter(
        {
            name: "in-memory" as Name,
            operations,
            entities,
            functions,
            snowflake,
            session,
            optimistic,
        },
        {
            entities: new Map(),
            mutations: new Map(),
        },
    ) as Adapter
}
