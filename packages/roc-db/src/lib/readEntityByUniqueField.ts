import { NotFoundError } from "../errors/NotFoundError"
import type { Transaction } from "../types/Transaction"

export const readEntityByUniqueField = (
    txn: Transaction,
    entity: string,
    field: string,
    value: any,
    throwIfMissing = true,
) => {
    // if (txn.operation)
    // if (txn.changeSet.entities.has(ref)) {
    //     const entity = txn.changeSet.entities.get(ref)
    //     if (entity === DELETED_IN_CHANGE_SET_SYMBOL) {
    //         if (throwIfMissing) throw new NotFoundError(ref)
    //         return undefined
    //     }
    //     return entity
    // }
    if (txn.request.operation.type === "write")
        throw new Error(
            "readEntityByUniqueField not yet supported in a write operation",
        )
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
    const document = ref ? await txn.readEntity(ref) : undefined
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
    const document = ref ? txn.readEntity(ref) : undefined
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
    document,
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
