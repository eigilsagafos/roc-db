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
    type Atom,
} from "valdres"

export const createValdresAdapter = ({
    operations,
    entities,
    store, // = createStore(),
    txn,
    session,
    entityAtom, // = atomFamily<string, Entity | null>(null),
    mutationAtom, // = atomFamily<string, Mutation | null>(null),
    mutationListAtom,
}: {
    operations: readonly Operation[]
    entities: readonly Entity[]
    store?: Store
    txn?: TransactionInterface
    entityAtom?: AtomFamily<string, Entity | null>
    mutationAtom?: AtomFamily<string, Mutation | null>
    mutationListAtom?: Atom<string[]>
}) => {
    return createAdapter(
        {
            name: "valdres",
            operations,
            entities,
            functions,
            session,
            snowflake: new Snowflake(1, 1),
            // initChangeSetOnce: true,
        },
        {
            txn,
            store,
            entityAtom,
            mutationAtom,
            mutationListAtom,
            // entityRefListAtom = atomFamily<string, string[]>([]),
            // mutationActions,
        },
    ) as Adapter
}
