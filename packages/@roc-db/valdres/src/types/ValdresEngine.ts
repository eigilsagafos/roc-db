import type { EntityDocument, Mutation, Ref } from "roc-db"
import type { Atom, Collection, Store, Transaction } from "valdres"

// Keys of the unique and index lookups: (entity, field, value).
type LookupArgs = [string, string, string | number | boolean]

// Entities and mutations are enumerated (paging, debounce, changeSet replay),
// so they live in valdres collections: `entityAtom(ref)` is a row, and
// `get(entityAtom)` lists the present rows. valdres families have no
// membership, so the lookups that are only ever addressed by key are plain
// `family(() => atom(...))` factories.
export type EntityCollection = Collection<string, EntityDocument>
export type MutationCollection = Collection<string, Mutation>
export type EntityUniqueFamily = (...args: LookupArgs) => Atom<Ref | null>
export type EntityIndexFamily = (...args: LookupArgs) => Atom<Ref[]>

// The engine options valdres supplies to `createAdapter`. This is the *base*
// shape: at the root adapter there is no active transaction, so `txn`/`rootTxn`
// are absent. `begin`/`beginRequest` derive the transactional shape from it
// (see ValdresTxnEngine) before the read/write functions run.
export type ValdresEngine = {
    // Present as keys on the base engine (createValdresAdapter always passes
    // them), but undefined at the root adapter where no transaction is active.
    // `begin`/`beginRequest` populate them; write-context functions narrow to
    // ValdresTxnEngine. Kept required-with-`| undefined` (not optional) so the
    // type matches the engine-options object literal createAdapter infers.
    txn: Transaction | undefined
    rootTxn: Transaction | undefined
    store: Store | undefined
    // Attached by onChangeSetInit: the changeSet's scope, a child Store of
    // `store`.
    scopedStore?: Store
    entityAtom: EntityCollection
    mutationAtom: MutationCollection
    entityUniqueAtom: EntityUniqueFamily
    entityIndexAtom: EntityIndexFamily
    entityRefListAtom?: (entity: string) => Atom<Ref[]>
}

// The engine as seen by functions that run inside a transaction (everything
// after `begin`): `txn` and `rootTxn` are guaranteed present. Write-context
// functions narrow the base engine to this via `as ValdresTxnEngine`, which
// encodes the runtime invariant without any runtime cost.
export type ValdresTxnEngine = ValdresEngine & {
    txn: Transaction
    rootTxn: Transaction
}
