import { NotFoundError } from "../errors/NotFoundError"
import type { Entity } from "../types/Entity"
import type { Ref } from "../types/Ref"
import type { Transaction } from "../types/Transaction"
import { DELETED_IN_CHANGE_SET_SYMBOL } from "../utils/DELETED_IN_CHANGE_SET_SYMBOL"

export const readEntity = (
    txn: Transaction,
    ref: Ref,
    throwIfMissing = true,
) => {
    if (txn.changeSet.entities.has(ref)) {
        const entity = txn.changeSet.entities.get(ref)
        if (entity === DELETED_IN_CHANGE_SET_SYMBOL) {
            if (throwIfMissing) throw new NotFoundError(ref)
            return undefined
        }
        return entity
    }
    if (txn.adapterOpts.async) {
        return readEntityAsync(txn, ref, throwIfMissing)
    } else {
        return readEntitySync(txn, ref, throwIfMissing)
    }
}

const readEntityAsync = async (
    txn: Transaction,
    ref: Ref,
    throwIfMissing = true,
) => {
    const entity = await txn.adapterOpts.functions.readEntity(txn, ref)
    return handleReadResponse(txn, ref, entity, throwIfMissing)
}

const readEntitySync = (txn: Transaction, ref: Ref, throwIfMissing = true) => {
    const entity = txn.adapterOpts.functions.readEntity(txn, ref)
    return handleReadResponse(txn, ref, entity, throwIfMissing)
}

const handleReadResponse = (
    txn: Transaction,
    ref: Ref,
    entity: Entity | undefined,
    throwIfMissing: boolean,
) => {
    if (!entity && throwIfMissing) throw new NotFoundError(ref)
    txn.changeSet.entities.set(ref, entity)
    return entity
}
