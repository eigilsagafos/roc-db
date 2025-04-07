import { NotFoundError } from "../errors/NotFoundError"
import type { Mutation } from "../types/Mutation"
import type { Ref } from "../types/Ref"
import type { Transaction } from "../types/Transaction"
import { DELETED_IN_CHANGE_SET_SYMBOL } from "../utils/DELETED_IN_CHANGE_SET_SYMBOL"

export const readMutation = (
    txn: Transaction,
    ref: Ref,
    throwIfMissing = true,
) => {
    if (txn.changeSet.entities.has(ref)) {
        const mutation = txn.changeSet.entities.get(ref)
        if (mutation === DELETED_IN_CHANGE_SET_SYMBOL) {
            if (throwIfMissing) throw new NotFoundError(ref)
            return undefined
        }
        return mutation
    }
    if (txn.adapterOpts.async) {
        return readMutationAsync(txn, ref, throwIfMissing)
    } else {
        return readMutationSync(txn, ref, throwIfMissing)
    }
}

const readMutationAsync = async (
    txn: Transaction,
    ref: Ref,
    throwIfMissing = true,
) => {
    const mutation = await txn.adapterOpts.functions.readMutation(
        txn.engineOpts,
        ref,
    )
    return handleReadResponse(txn, ref, mutation, throwIfMissing)
}

const readMutationSync = (
    txn: Transaction,
    ref: Ref,
    throwIfMissing = true,
) => {
    const mutation = txn.adapterOpts.functions.readMutation(txn.engineOpts, ref)
    return handleReadResponse(txn, ref, mutation, throwIfMissing)
}

const handleReadResponse = (
    txn: Transaction,
    ref: Ref,
    mutation: Mutation | undefined,
    throwIfMissing: boolean,
) => {
    if (!mutation && throwIfMissing) throw new NotFoundError(ref)
    txn.changeSet.entities.set(ref, mutation)
    return mutation
}
