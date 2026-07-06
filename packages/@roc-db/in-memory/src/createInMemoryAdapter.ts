import {
    createAdapter,
    Snowflake,
    type Adapter,
    type Operation,
    type Session,
} from "roc-db"
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
    engine,
}: {
    operations: Operations
    entities: Entities
    snowflake?: Snowflake
    optimistic?: boolean
    session: Session
    engine?: {
        entities: Map<string, any>
        mutations: Map<string, any>
        entitiesUnique: Map<string, any>
        entitiesIndex: Map<string, any>
    }
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
        engine ?? {
            entities: new Map(),
            mutations: new Map(),
            entitiesUnique: new Map(),
            entitiesIndex: new Map(),
        },
    ) as Adapter
}
