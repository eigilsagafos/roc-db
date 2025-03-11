import { NotFoundError, refsFromRelations } from "roc-db"
import { readEntity } from "./readEntity"

export const deleteEntity = (txn, ref) => {
    const existingEntity = readEntity(txn, ref)
    if (!existingEntity) throw new NotFoundError(ref)
    const { entityAtom, entityRefListAtom } = txn.engineOpts

    txn.engineOpts.txn.reset(entityAtom(ref))
    if (entityRefListAtom) {
        throw new Error("TODO support entityRefListAtom")
    }
    return 1
}
