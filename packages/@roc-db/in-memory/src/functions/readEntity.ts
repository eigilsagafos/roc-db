import { DELETED_IN_CHANGE_SET_SYMBOL } from "roc-db"

export const readEntity = (txn, ref) => {
    if (txn.request.changeSetRef) {
        const doc = txn.engineOpts.changeSet.entities.get(ref)
        if (doc === DELETED_IN_CHANGE_SET_SYMBOL) return undefined
        if (doc) return doc
    }
    return txn.engineOpts.entities.get(ref)
}
