import type { Mutation } from "../types/Mutation"
import type { Ref } from "../types/Ref"
import type { Transaction } from "../types/Transaction"
import { findOperation } from "./findOperation"
import { parseRequestPayload } from "./parseRequestPayload"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { runSyncFunctionChain } from "./runSyncFunctionChain"
import { WriteTransaction } from "./WriteTransaction"

export const initializeChangeSet = (txn: Transaction) => {
    if (!txn.changeSetRef) return
    if (txn.adapterOpts.async) {
        return initializeChangeSetAsync(txn)
    } else {
        return initializeChangeSetSync(txn)
    }
}

const prepareInitTransaction = (txn: Transaction, mutation: Mutation) => {
    const operation = findOperation(txn.adapterOpts.operations, mutation)
    const request = operation(mutation.payload, txn.changeSetRef ?? undefined)
    const payload = parseRequestPayload(request)
    return new WriteTransaction(
        request,
        txn.engineOpts,
        txn.adapterOpts,
        payload,
        mutation,
        mutation.log,
        txn.changeSet,
    )
}

const initializeChangeSetAsync = async (txn: Transaction) => {
    const mutations = await txn.adapterOpts.functions.getChangeSetMutations(
        txn,
        txn.changeSetRef as Ref,
    )
    if (mutations.length) {
        for (const mutation of mutations) {
            const initTxn = prepareInitTransaction(txn, mutation)
            await runAsyncFunctionChain(initTxn.request.callback(initTxn))
        }
    }
    txn.changeSetInitialized = true
}
const initializeChangeSetSync = (txn: Transaction) => {
    const mutations = txn.adapterOpts.functions.getChangeSetMutations(
        txn,
        txn.changeSetRef as Ref,
    )
    if (mutations.length) {
        for (const mutation of mutations) {
            const initTxn = prepareInitTransaction(txn, mutation)
            runSyncFunctionChain(initTxn.request.callback(initTxn))
        }
    }
    txn.changeSetInitialized = true
}
