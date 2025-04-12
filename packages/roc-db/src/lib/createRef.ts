import type { Ref } from "../types/Ref"
import { entityFromRef } from "../utils/entityFromRef"
import { generateRef } from "../utils/generateRef"
import type { WriteTransaction } from "./WriteTransaction"

export const createRef = (txn: WriteTransaction, entity: string): Ref => {
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
        return nextRef as Ref
    }

    const ref = generateRef(
        entity,
        txn.adapter.snowflake,
        txn.mutation.timestamp,
    )
    return ref as Ref
}
