import type { EntityDocument, Mutation, Ref } from "roc-db"
import type { AtomFamily, Store, TransactionInterface } from "valdres"

// The engine options valdres supplies to `createAdapter`. This is the *base*
// shape: at the root adapter there is no active transaction, so `txn`/`rootTxn`
// are absent. `begin`/`beginRequest` derive the transactional shape from it
// (see ValdresTxnEngine) before the read/write functions run.
//
// The atom generics mirror createValdresAdapter's params (value-first,
// args-second; see the type-test in test/types).
export type ValdresEngine = {
    // Present as keys on the base engine (createValdresAdapter always passes
    // them), but undefined at the root adapter where no transaction is active.
    // `begin`/`beginRequest` populate them; write-context functions narrow to
    // ValdresTxnEngine. Kept required-with-`| undefined` (not optional) so the
    // type matches the engine-options object literal createAdapter infers.
    txn: TransactionInterface | undefined
    rootTxn: TransactionInterface | undefined
    store: Store | undefined
    // Attached by beginRequest when operating inside a changeSet scope.
    scopedStore?: Store
    scopedStoreAlreadyAttachedBeforeBegin?: boolean
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
    entityRefListAtom?: AtomFamily<Ref[], [string]>
}

// The engine as seen by functions that run inside a transaction (everything
// after `begin`): `txn` and `rootTxn` are guaranteed present. Write-context
// functions narrow the base engine to this via `as ValdresTxnEngine`, which
// encodes the runtime invariant without any runtime cost.
export type ValdresTxnEngine = ValdresEngine & {
    txn: TransactionInterface
    rootTxn: TransactionInterface
}
