import type { Entity, MutationRef, Ref, Mutation } from "roc-db"
import type { AtomFamily, Store, TransactionInterface } from "valdres"

export type ValdresEngine = {
    txn: TransactionInterface
    store: Store
    entityAtom: AtomFamily<Ref, Entity>
    mutationAtom: AtomFamily<MutationRef, Mutation>
    entityRefListAtom?: AtomFamily<string, Ref[]>
}
