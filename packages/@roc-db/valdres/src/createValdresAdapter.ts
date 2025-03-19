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
    type TransactionInterface,
} from "valdres"

export const createValdresAdapter = ({
    operations,
    entities,
    store, // = createStore(),
    txn,
    session,
    entityAtom, // = atomFamily<string, Entity | null>(null),
    mutationAtom, // = atomFamily<string, Mutation | null>(null),
}: {
    operations: readonly Operation[]
    entities: readonly Entity[]
    store?: Store
    txn?: TransactionInterface
    entityAtom?: AtomFamily<string, Entity | null>
    mutationAtom?: AtomFamily<string, Mutation | null>
}) => {
    return createAdapter(
        {
            name: "valdres",
            operations,
            entities,
            functions,
            session,
            snowflake: new Snowflake(1, 1),
            initChangeSetOnce: true,
        },
        {
            txn,
            store,
            entityAtom,
            mutationAtom,
            // entityRefListAtom = atomFamily<string, string[]>([]),
            // mutationActions,
        },
    ) as Adapter
}
