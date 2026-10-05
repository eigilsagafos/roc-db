import {
    createAdapter,
    type Adapter,
    type Entity,
    Snowflake,
    type Operation,
    type Ref,
} from "roc-db"
import * as functions from "./functions"
import type { Store, Transaction } from "valdres"
import type {
    EntityCollection,
    EntityIndexFamily,
    EntityUniqueFamily,
    MutationCollection,
} from "./types/ValdresEngine"

export const createValdresAdapter = <
    Session extends { identityRef: string; sessionRef?: string },
>({
    operations,
    entities,
    store, // = createStore(),
    rootTxn,
    txn,
    session,
    entityAtom, // = collection<string, EntityDocument>()
    entityUniqueAtom, // = family((entity, key, value) => atom<Ref | null>(null))
    entityIndexAtom, // = family((entity, key, value) => atom<Ref[]>([]))
    mutationAtom, // = collection<string, Mutation>()
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
    rootTxn?: Transaction
    txn?: Transaction
    entityAtom: EntityCollection
    mutationAtom: MutationCollection
    entityUniqueAtom: EntityUniqueFamily
    entityIndexAtom: EntityIndexFamily
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
    // valdres transactions commit synchronously and reject promise callbacks.
    if (async) throw new Error("The valdres adapter does not support async")
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
            // mutationActions,
        },
    ) as Adapter
}
