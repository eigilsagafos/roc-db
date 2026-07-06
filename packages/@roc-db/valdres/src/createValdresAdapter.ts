import {
    createAdapter,
    type Adapter,
    type Entity,
    type EntityDocument,
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

export const createValdresAdapter = <
    Session extends { identityRef: string; sessionRef?: string },
>({
    operations,
    entities,
    store, // = createStore(),
    rootTxn,
    txn,
    session,
    entityAtom, // = atomFamily<EntityDocument | null, [string]>(null),
    entityUniqueAtom,
    entityIndexAtom,
    mutationAtom, // = atomFamily<Mutation | null, [string]>(null),
    changeSetRef,
    optimistic = true,
    snowflake = new Snowflake(1, 1),
    async = false,
    validateCreate,
    validateUpdate,
    validateDelete,
}: {
    operations: readonly Operation[]
    entities: readonly Entity<any>[]
    store?: Store
    rootTxn?: TransactionInterface
    txn?: TransactionInterface
    entityAtom: AtomFamily<EntityDocument | null, [string]>
    mutationAtom: AtomFamily<Mutation | null, [string]>
    entityUniqueAtom: AtomFamily<
        Ref | null,
        [string, string, string | number | boolean]
    >
    entityIndexAtom: AtomFamily<
        Ref[],
        [string, string, string | number | boolean]
    >
    changeSetRef?: Ref
    session: Session
    optimistic: boolean
    snowflake?: Snowflake
    async?: boolean
    validateCreate?: () => void
    validateUpdate?: () => void
    validateDelete?: () => void
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
            validateCreate,
            validateUpdate,
            validateDelete,
            async,
            // initChangeSetOnce: true,
        },
        {
            txn,
            rootTxn,
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
