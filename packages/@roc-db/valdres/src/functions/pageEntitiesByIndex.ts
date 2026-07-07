import type { PageEntitiesByIndexFunction, Ref } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const pageEntitiesByIndex: PageEntitiesByIndexFunction<ValdresEngine> = (
    txn,
    entity,
    key,
    value,
) => {
    const { entityIndexAtom, txn: valdresTxn } =
        txn.engineOpts as ValdresTxnEngine
    if (!entityIndexAtom) throw new Error("No entityIndexAtom")
    const atom = entityIndexAtom(entity, key, value)
    const refs = valdresTxn.get(atom)
    return refs.map((ref: Ref) => txn.readEntity(ref))
}
