import { NotFoundError } from "../errors/NotFoundError"
import type { Transaction } from "../types/Transaction"
import { DELETED_IN_CHANGE_SET_SYMBOL } from "../utils/DELETED_IN_CHANGE_SET_SYMBOL"

export const readEntityByUniqueField = (
    txn: Transaction,
    entity: string,
    field: string,
    value: any,
    throwIfMissing = true,
) => {
    const model = txn.adapter.models[entity]
    if (!model) {
        throw new Error(
            `Entity ${entity} not found in adapter. Available entities: ${Object.keys(
                txn.adapter.entities,
            )}`,
        )
    }
    const fieldIndex = model.uniqueDataKeys.indexOf(field)
    if (fieldIndex === -1) {
        throw new Error(
            `Field ${field} is not a unique field for entity ${entity}. Available unique fields: ${model.uniqueDataKeys}`,
        )
    }

    const key = `${entity}:${field}:${JSON.stringify(value)}`

    if (txn.changeSet.entitiesUnique.has(key)) {
        const ref = txn.changeSet.entitiesUnique.get(key)
        if (ref === DELETED_IN_CHANGE_SET_SYMBOL) {
            if (throwIfMissing) {
                return handleReadResponse(txn, null, entity, field, value, true)
            }
            return null
        }
        return txn.readEntity(ref)
    }

    if (txn.adapter.async) {
        return readEntityByUniqueFieldAsync(
            txn,
            entity,
            field,
            fieldIndex,
            value,
            throwIfMissing,
        )
    } else {
        return readEntityByUniqueFieldSync(
            txn,
            entity,
            field,
            fieldIndex,
            value,
            throwIfMissing,
        )
    }
}

const readEntityByUniqueFieldAsync = async (
    txn: Transaction,
    entity: string,
    field: string,
    fieldIndex: number,
    value: any,
    throwIfMissing = true,
) => {
    const ref = await txn.adapter.functions.refByUniqueField(
        txn,
        entity,
        field,
        fieldIndex,
        value,
    )
    const document = ref ? await txn.readEntity(ref, false) : undefined
    return handleReadResponse(
        txn,
        document,
        field,
        value,
        document,
        throwIfMissing,
    )
}

const readEntityByUniqueFieldSync = (
    txn: Transaction,
    entity: string,
    field: string,
    fieldIndex: number,
    value: any,
    throwIfMissing = true,
) => {
    const ref = txn.adapter.functions.refByUniqueField(
        txn,
        entity,
        field,
        fieldIndex,
        value,
    )
    const document = ref ? txn.readEntity(ref, false) : undefined
    return handleReadResponse(
        txn,
        document,
        entity,
        field,
        value,
        throwIfMissing,
    )
}

const handleReadResponse = (
    txn: Transaction,
    document = null,
    entity,
    field,
    value,
    throwIfMissing: boolean,
) => {
    if (!document && throwIfMissing)
        throw new NotFoundError(
            `entity ${entity} with ${field} ${value} not found`,
        )
    return document
}
