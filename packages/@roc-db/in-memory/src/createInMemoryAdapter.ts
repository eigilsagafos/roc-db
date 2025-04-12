import { createAdapter, Snowflake, type Operation, type Session } from "roc-db"
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
    optimistic = true,
    session,
}: {
    operations: Operations
    entities: Entities
    snowflake?: Snowflake
    optimistic?: boolean
    session: Session
}) => {
    return createAdapter(
        {
            name: "in-memory" as Name,
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
        },
    )
}
