import {
    createAdapter,
    type Adapter,
    type Entity,
    type Mutation,
    Snowflake,
    type Operation,
    type Ref,
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

export const createValdresAdapter = <Session>({
    operations,
    entities,
    store, // = createStore(),
    txn,
    session,
    entityAtom, // = atomFamily<string, Entity | null>(null),
    entityUniqueAtom,
    entityIndexAtom,
    mutationAtom, // = atomFamily<string, Mutation | null>(null),
    changeSetRef,
    optimistic = true,
}: {
    operations: readonly Operation[]
    entities: readonly Entity[]
    store?: Store
    txn?: TransactionInterface
    entityAtom?: AtomFamily<string, Entity | null>
    mutationAtom?: AtomFamily<string, Mutation | null>
    changeSetRef?: Ref
    session: Session
    optimistic: boolean
}) => {
    return createAdapter(
        {
            name: "valdres",
            operations,
            entities,
            functions,
            optimistic,
            session,
            snowflake: new Snowflake(1, 1),
            changeSetRef,
            // initChangeSetOnce: true,
        },
        {
            txn,
            store,
            entityAtom,
            mutationAtom,
            entityUniqueAtom,
            entityIndexAtom,
            // entityRefListAtom = atomFamily<string, string[]>([]),
            // mutationActions,
        },
    ) as Adapter
}
