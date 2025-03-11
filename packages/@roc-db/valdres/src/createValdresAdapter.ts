import {
    createAdapter,
    type Adapter,
    type Entity,
    type Mutation,
    Snowflake,
    type Operation,
} from "roc-db"
import * as functions from "./functions"
import {
    // atomFamily,
    // store as createStore,
    type Store,
    type AtomFamily,
} from "valdres"

export const createValdresAdapter = ({
    operations,
    entities,
    store, // = createStore(),
    entityAtom, // = atomFamily<string, Entity | null>(null),
    mutationAtom, // = atomFamily<string, Mutation | null>(null),
}: {
    operations: readonly Operation[]
    entities: readonly Entity[]
    store?: Store
    entityAtom?: AtomFamily<string, Entity | null>
    mutationAtom?: AtomFamily<string, Mutation | null>
}) => {
    return createAdapter(
        {
            name: "valdres",
            operations,
            entities,
            functions,
            snowflake: new Snowflake(1, 1),
        },
        {
            store,
            entityAtom,
            mutationAtom,
            // entityRefListAtom = atomFamily<string, string[]>([]),
            // mutationActions,
        },
    ) as Adapter
}
