import type { PageEntitiesFunction, Ref } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const pageEntities: PageEntitiesFunction<ValdresEngine> = (
    txn,
    args,
) => {
    const { size, skip, changeSetRef, entities, childrenOf } = args
    const { entityAtom, txn: valdresTxn } = txn.engineOpts as ValdresTxnEngine
    const atoms = valdresTxn.get(entityAtom)

    let res = []
    for (const atom of atoms) {
        const entity = valdresTxn.get(atom)
        if (!entity) continue
        if (entities && entities !== "*" && !entities.includes(entity.entity))
            continue
        if (childrenOf && childrenOf.length > 0) {
            if (
                !(entity as any).__.parentRefs?.some((ref: Ref) =>
                    childrenOf.includes(ref),
                )
            )
                continue
        }
        res.push(entity)
        if (res.length >= size) break
    }
    return res
}
