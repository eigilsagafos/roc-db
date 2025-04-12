import { BadRequestError } from "../errors/BadRequestError"
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
    if (txn.adapter.async) {
        return initializeChangeSetAsync(txn)
    } else {
        return initializeChangeSetSync(txn)
    }
}

const prepareInitTransaction = (txn: Transaction, mutation: Mutation) => {
    const operation = findOperation(txn.adapter.operations, mutation)
    const request = {
        operation,
        payload: mutation.payload,
        changeSetRef: txn.changeSetRef,
    }
    const payload = parseRequestPayload(request)
    return new WriteTransaction(
        request,
        txn.engineOpts,
        txn.adapter,
        payload,
        mutation,
        mutation.log,
        txn.changeSet,
    )
}

const initializeChangeSetAsync = async (txn: Transaction) => {
    const changeSetEntity = await txn.readEntity(txn.changeSetRef, false)
    if (!changeSetEntity)
        throw new BadRequestError("The provided changeSetRef does not exist")
    const mutations = await txn.adapter.functions.getChangeSetMutations(
        txn,
        txn.changeSetRef as Ref,
    )
    if (mutations.length) {
        for (const mutation of mutations) {
            const initTxn = prepareInitTransaction(txn, mutation)
            await runAsyncFunctionChain(
                initTxn.request.operation.callback(initTxn),
            )
        }
    }
    txn.changeSetInitialized = true
}
const initializeChangeSetSync = (txn: Transaction) => {
    const changeSetEntity = txn.readEntity(txn.changeSetRef, false)
    if (!changeSetEntity)
        throw new BadRequestError("The provided changeSetRef does not exist")
    const mutations = txn.adapter.functions.getChangeSetMutations(
        txn,
        txn.changeSetRef as Ref,
    )
    if (mutations.length) {
        for (const mutation of mutations) {
            const initTxn = prepareInitTransaction(txn, mutation)
            runSyncFunctionChain(initTxn.request.operation.callback(initTxn))
        }
    }
    txn.changeSetInitialized = true
}
