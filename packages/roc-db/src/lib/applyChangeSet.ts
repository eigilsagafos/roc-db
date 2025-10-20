import type { Mutation } from "../types/Mutation"
import type { Ref } from "../types/Ref"
import type { WriteRequest } from "../types/WriteRequest"
import { findOperation } from "./findOperation"
import { parseRequestPayload } from "./parseRequestPayload"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { runSyncFunctionChain } from "./runSyncFunctionChain"
import { sortMutations } from "../utils/sortMutations"
import { WriteTransaction } from "./WriteTransaction"

export const applyChangeSet = (txn: WriteTransaction, ref) => {
    if (txn.adapter.async) {
        return applyChangeSetAsync(txn, ref)
    } else {
        return applyChangeSetSync(txn, ref)
    }
}

const applyChangeSetSync = (txn: WriteTransaction, ref: Ref) => {
    const mutations = txn.adapter.functions.getChangeSetMutations(txn, ref)
    if (mutations.length) {
        const sortedMutations = sortMutations(mutations)
        for (const mutation of sortedMutations) {
            const applyTxn = prepareTransaction(txn, mutation)
            runSyncFunctionChain(applyTxn.request.operation.callback(applyTxn))
        }
    }
    if (txn.adapter.functions.onChangeSetApplied) {
        txn.adapter.functions.onChangeSetApplied(txn, ref)
    }
}

const applyChangeSetAsync = async (txn: WriteTransaction, ref: Ref) => {
    const mutations = await txn.adapter.functions.getChangeSetMutations(
        txn,
        ref,
    )
    if (mutations.length) {
        const sortedMutations = sortMutations(mutations)
        for (const mutation of sortedMutations) {
            const applyTxn = prepareTransaction(txn, mutation)
            await runAsyncFunctionChain(
                applyTxn.request.operation.callback(applyTxn),
            )
        }
    }
    if (txn.adapter.functions.onChangeSetApplied) {
        await txn.adapter.functions.onChangeSetApplied(txn, ref)
    }
}

const prepareTransaction = (txn: WriteTransaction, mutation: Mutation) => {
    const operation = findOperation(txn.adapter.operations, mutation)
    const { changeSetRef, ...rest } = mutation
    const request = {
        type: "write",
        operation,
        payload: mutation.payload,
        isApplyChangeSet: true,
    } as WriteRequest

    const payload = parseRequestPayload(request)
    // TODO: Should we rather create a different transaction object?
    // To make it more clear that we re-use the changeSet and log?
    return new WriteTransaction(
        request,
        txn.engineOpts,
        txn.adapter,
        payload,
        rest,
        mutation.log,
        txn.changeSet,
        txn.log,
    )
}
