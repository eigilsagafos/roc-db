import {
    createAdapter,
    type Adapter,
    type Entity,
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
} from "valdres"

export type ValdresEngineOptions = {
    txn?: TransactionInterface
    rootTxn?: TransactionInterface
    store?: Store
    scopedStore?: Store
    entityAtom: AtomFamily<any, any>
    mutationAtom: AtomFamily<any, any>
    entityUniqueAtom: AtomFamily<any, any>
    entityIndexAtom: AtomFamily<any, any>
}

export type ValdresAdapterOptions<
    Operations extends readonly Operation[] = readonly Operation[],
> = {
    operations: Operations
    entities: readonly Entity[]
    changeSetRef?: Ref
    session: any
    optimistic?: boolean
    snowflake?: Snowflake
    async?: boolean
    validateCreate?: (...args: any[]) => void
    validateUpdate?: (...args: any[]) => void
    validateDelete?: (...args: any[]) => void
} & ValdresEngineOptions

export const createValdresAdapter = <
    const Operations extends readonly Operation[],
>({
    operations,
    entities,
    store, // = createStore(),
    rootTxn,
    txn,
    session,
    entityAtom, // = atomFamily<string, Entity | null>(null),
    entityUniqueAtom,
    entityIndexAtom,
    mutationAtom, // = atomFamily<string, Mutation | null>(null),
    changeSetRef,
    optimistic = true,
    snowflake = new Snowflake(1, 1),
    async = false,
    validateCreate,
    validateUpdate,
    validateDelete,
}: ValdresAdapterOptions<Operations>): Adapter<
    Operations,
    ValdresEngineOptions
> => {
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
        } as any,
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
    )
}
