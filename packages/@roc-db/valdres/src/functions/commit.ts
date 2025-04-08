import type { Entity, Mutation, Ref, WriteTransaction } from "roc-db"
import { commitDelete } from "./commitDelete"
import { saveMutation } from "./saveMutation"

export const commit = (
    txn: WriteTransaction,
    mutation: Mutation,
    {
        created,
        updated,
        deleted,
    }: { created: Entity[]; updated: Entity[]; deleted: Ref[] },
) => {
    const { mutationAtom, mutationListAtom } = txn.engineOpts
    const atom = mutationAtom(txn.mutation.ref)
    const currentMutation = txn.engineOpts.rootTxn.get(atom)
    if (currentMutation) {
        if (currentMutation && mutation.appliedAt === txn.timestamp) {
            saveMutation(txn, mutation)
        } else if (
            currentMutation &&
            mutation.debounceCount > currentMutation.debounceCount
        ) {
            saveMutation(txn, mutation)
        } else {
            throw new Error("Mutation already exists")
        }
    } else {
        saveMutation(txn, mutation)
    }

    const { entityAtom, entityRefListAtom, txn: valdresTxn } = txn.engineOpts
    for (const doc of created) {
        valdresTxn.set(entityAtom(doc.ref), doc)
    }
    if (created.length && entityRefListAtom) {
        const entity = created[0].entity
        valdresTxn.set(entityRefListAtom(entity), (curr: string[]) => [
            ...curr,
            created.map(doc => doc.ref),
        ])
    }
    for (const doc of updated) {
        valdresTxn.set(entityAtom(doc.ref), doc)
    }
    for (const ref of deleted) {
        commitDelete(txn, ref)
    }
    return mutation
}
