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
    snowflake = new Snowflake(1, 1),
}: {
    operations: readonly Operation[]
    entities: readonly Entity[]
    store?: Store
    txn?: TransactionInterface
    entityAtom: AtomFamily<string, Entity | null>
    mutationAtom: AtomFamily<string, Mutation | null>
    entityUniqueAtom: AtomFamily<Ref, [string]>
    entityIndexAtom: AtomFamily<Ref, [string, string, string]>
    changeSetRef?: Ref
    session: Session
    optimistic: boolean
    snowflake?: Snowflake
}) => {
    if (!entityAtom) throw new Error("entityAtom is required")
    if (!mutationAtom) throw new Error("mutationAtom is required")
    if (!entityUniqueAtom) throw new Error("entityUniqueAtom is required")
    if (!entityIndexAtom) throw new Error("entityIndexAtom is required")
    return createAdapter(
        {
            name: "valdres",
            operations,
            entities,
            functions,
            optimistic,
            session,
            snowflake,
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
