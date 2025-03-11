import { DELETED_IN_CHANGE_SET_SYMBOL } from "roc-db"

export const deleteEntity = (txn, ref) => {
    if (txn.request.changeSetRef) {
        txn.engineOpts.changeSet.entities.set(ref, DELETED_IN_CHANGE_SET_SYMBOL)
        return true
    } else {
        txn.engineOpts.entities.delete(ref)
        return true
    }
}
