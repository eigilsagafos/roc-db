import type { Mutation } from "../types/Mutation"
import type { Ref } from "../types/Ref"
import { findOperation } from "./findOperation"
import { parseRequestPayload } from "./parseRequestPayload"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { runSyncFunctionChain } from "./runSyncFunctionChain"
import { WriteTransaction } from "./WriteTransaction"

export const applyChangeSet = (txn: WriteTransaction, ref) => {
    if (txn.adapterOpts.async) {
        return applyChangeSetAsync(txn, ref)
    } else {
        return applyChangeSetSync(txn, ref)
    }
}

const applyChangeSetSync = (txn: WriteTransaction, ref: Ref) => {
    const res = txn.adapterOpts.functions.getChangeSetMutations(txn, ref)
    if (res.length) {
        for (const mutation of res) {
            const applyTxn = prepareTransaction(txn, mutation)
            runSyncFunctionChain(applyTxn.request.callback(applyTxn))
            applyTxn.commit(true)
        }
    }
}
const applyChangeSetAsync = async (txn: WriteTransaction, ref: Ref) => {
    const res = await txn.adapterOpts.functions.getChangeSetMutations(txn, ref)
    if (res.length) {
        for (const mutation of res) {
            const applyTxn = prepareTransaction(txn, mutation)
            await runAsyncFunctionChain(applyTxn.request.callback(applyTxn))
            await applyTxn.commit(true)
        }
    }
}

const prepareTransaction = (txn: WriteTransaction, mutation: Mutation) => {
    const operation = findOperation(txn.adapterOpts.operations, mutation)
    const { changeSetRef, ...rest } = mutation
    const request = operation(mutation.payload, undefined)
    const payload = parseRequestPayload(request)
    return new WriteTransaction(
        request,
        txn.engineOpts,
        txn.adapterOpts,
        payload,
        rest,
        mutation.log,
    )
}
