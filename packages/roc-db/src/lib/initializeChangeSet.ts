import { BadRequestError } from "../errors/BadRequestError"
import type { Mutation } from "../types/Mutation"
import type { Ref } from "../types/Ref"
import type { Transaction } from "../types/Transaction"
import { findOperation } from "./findOperation"
import { parseRequestPayload } from "./parseRequestPayload"
import { runAsyncFunctionChain } from "./runAsyncFunctionChain"
import { runSyncFunctionChain } from "./runSyncFunctionChain"
import { sortMutations } from "./sortMutations"
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
    const changeSetDoc = await txn.readEntity(txn.changeSetRef, false)
    verifyChangeSet(changeSetDoc)
    if (changeSetDoc.parents.version) {
        const versionDoc = await txn.readEntity(
            changeSetDoc.parents.version,
            false,
        )
        if (versionDoc?.data?.snapshot) {
            for (const doc of versionDoc.data.snapshot) {
                txn.changeSet.entities.set(doc.ref, doc)
            }
        }
    }
    const mutations = await txn.adapter.functions.getChangeSetMutations(
        txn,
        txn.changeSetRef as Ref,
    )
    const sorted = sortMutations(mutations)
    if (mutations.length) {
        for (const mutation of sorted) {
            const initTxn = prepareInitTransaction(txn, mutation)
            await runAsyncFunctionChain(
                initTxn.request.operation.callback(initTxn),
            )
        }
    }
    txn.changeSetInitialized = true
}

const initializeChangeSetSync = (txn: Transaction) => {
    const changeSetDoc = txn.readEntity(txn.changeSetRef, false)
    verifyChangeSet(changeSetDoc)
    if (changeSetDoc.parents.version) {
        const versionDoc = txn.readEntity(changeSetDoc.parents.version, false)
        if (versionDoc?.data?.snapshot) {
            for (const doc of versionDoc.data.snapshot) {
                txn.changeSet.entities.set(doc.ref, doc)
            }
        }
    }
    const mutations = txn.adapter.functions.getChangeSetMutations(
        txn,
        txn.changeSetRef as Ref,
    )
    const sorted = sortMutations(mutations)
    if (mutations.length) {
        for (const mutation of sorted) {
            const initTxn = prepareInitTransaction(txn, mutation)
            runSyncFunctionChain(initTxn.request.operation.callback(initTxn))
        }
    }
    txn.changeSetInitialized = true
}

const verifyChangeSet = changeSetDoc => {
    if (!changeSetDoc)
        throw new BadRequestError("The provided changeSetRef does not exist")
    if (changeSetDoc?.data?.appliedAt)
        throw new BadRequestError(
            "The provided changeSetRef has already been applied",
        )
}
