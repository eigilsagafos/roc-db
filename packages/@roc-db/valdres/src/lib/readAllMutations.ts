import type { Mutation } from "roc-db"
import type { ValdresTxnEngine } from "../types/ValdresEngine"

/**
 * Every mutation in the root store, lazily. Mutations always live on the root
 * txn (see saveMutation) — never only in a change-set scope — so this is the
 * complete log regardless of which scope the read runs in.
 */
export function* readAllMutations(engine: ValdresTxnEngine) {
    const { mutationAtom, rootTxn } = engine
    for (const atom of rootTxn.get(mutationAtom)) {
        yield rootTxn.get(atom) as Mutation | null
    }
}
