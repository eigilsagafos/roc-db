import type { EntityDocument, Mutation, Ref } from "roc-db"
import { atom, collection, family } from "valdres"

// The state definitions an application hands the adapter.
export const createAtoms = () => ({
    entityAtom: collection<string, EntityDocument>(),
    mutationAtom: collection<string, Mutation>(),
    entityUniqueAtom: family(
        (entity: string, key: string, value: string | number | boolean) =>
            atom<Ref | null>(null),
    ),
    entityIndexAtom: family(
        (entity: string, key: string, value: string | number | boolean) =>
            atom<Ref[]>([]),
    ),
})
