import { BadRequestError } from "../errors/BadRequestError"
import type { Ref } from "../types/Ref"
import { entityFromRef } from "../utils/entityFromRef"
import { generateRef } from "../utils/generateRef"
import type { WriteTransaction } from "./WriteTransaction"

export const createRef = <E extends string>(
    txn: WriteTransaction,
    entity: E,
): E | `${E}/${number}` => {
    const model = txn.adapter.models?.[entity]
    if (!model) {
        throw new BadRequestError(
            `Unknown entity '${entity}' passed to createRef. Did you register it on the adapter?`,
        )
    }
    const isSingleton = !!model.singleton

    if (txn.optimisticRefs.length) {
        const nextRef = txn.optimisticCreateRefs.shift()
        if (!nextRef) throw new Error("No next ref")
        const nextRefEntity = entityFromRef(nextRef)
        if (entity !== nextRefEntity) {
            throw new Error(
                "Wrong entity. Expected " +
                    entity +
                    " but got " +
                    nextRefEntity,
            )
        }
        txn.log.set(nextRef, ["ref"])
        return nextRef as E | `${E}/${number}`
    }

    const ref = isSingleton
        ? entity
        : generateRef(entity, txn.adapter.snowflake, txn.mutation.timestamp)
    txn.log.set(ref, ["ref"])
    return ref as E | `${E}/${number}`
}
