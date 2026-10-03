import {
    sortMutations,
    validateAndIndexDocument,
    findOperation,
    loadChangeSetBase,
    parseRequestPayload,
    WriteTransaction,
    runSyncFunctionChain,
    generateTransactionCache,
    DELETED_IN_CHANGE_SET_SYMBOL,
    type Mutation,
    type Ref,
    type OnChangeSetInitFunction,
} from "roc-db"
import type { Store, Transaction } from "valdres"
import type { ValdresEngine } from "../types/ValdresEngine"
import {
    getScopeState,
    registerScope,
    scopeBuiltAtom,
} from "../lib/scopeState"
import { getScopeTransaction, recordScopeWrites } from "../lib/scopeTransaction"

// Runs `callback` in the caller's transaction when the adapter was given one,
// and in a transaction of its own otherwise.
const inTransaction = <Result>(
    engineOpts: ValdresEngine,
    callback: (txn: Transaction) => Result,
): Result =>
    engineOpts.txn
        ? callback(engineOpts.txn)
        : (engineOpts.store as Store).txn(callback as any)

const prepareInitTransaction = (
    adapterOptions: any,
    engineOpts: ValdresEngine,
    mutation: Mutation,
    changeSet: any,
) => {
    const operation = findOperation(adapterOptions.operations, mutation)
    const request: any = {
        operation,
        payload: mutation.payload,
        changeSetRef: mutation.changeSetRef,
    }
    const payload = parseRequestPayload(request)
    return new WriteTransaction(
        request,
        engineOpts,
        {
            functions: adapterOptions.functions,
            async: adapterOptions.async,
            operations: adapterOptions.operations,
            models: adapterOptions.models,
        } as any,
        payload,
        mutation,
        mutation.log,
        changeSet,
    )
}

const getRootMutations = (
    engineOpts: ValdresEngine,
    adapterOptions: any,
    changeSetRef: Ref,
) => {
    const res = inTransaction(engineOpts, txn => {
        return adapterOptions.functions.getChangeSetMutations(
            {
                engineOpts: {
                    mutationAtom: engineOpts.mutationAtom,
                    rootTxn: txn,
                },
            },
            changeSetRef,
        )
    })
    return sortMutations(res as Mutation[])
}

export const onChangeSetInit: OnChangeSetInitFunction<ValdresEngine> = (
    engineOpts,
    adapterOptions,
    changeSetRef,
) => {
    const { mutationAtom, entityAtom } = engineOpts
    const store = engineOpts.store as Store
    const changeSet: any = inTransaction(engineOpts, txn =>
        txn.get(entityAtom(changeSetRef)),
    )

    // Opening a scope is not allowed inside a transaction, so inside the
    // caller's transaction the scope has to exist already.
    const scopedStore = engineOpts.txn ? undefined : store.scope(changeSetRef)
    if (scopedStore) registerScope(scopedStore, changeSetRef)
    const rootMutations = getRootMutations(
        engineOpts,
        adapterOptions,
        changeSetRef,
    )

    inTransaction(engineOpts, rootTxn => {
        const versionRef = changeSet?.parents?.version
        const scopeState = getScopeState(store, changeSetRef)
        const scopedTxn = recordScopeWrites(
            getScopeTransaction(rootTxn, changeSetRef),
            scopeState.written,
        )
        const cache = generateTransactionCache()
        // A scope this function has not built holds at most what later
        // requests wrote into it. Rebuild it from the base and the whole
        // history; replaying only part of it on top of the root would
        // overwrite newer rows with stale ones.
        const rebuild = !scopedTxn.get(scopeBuiltAtom)
        if (versionRef && rebuild) {
            // Seed the base snapshot via the shared helper so all three
            // seeding sites resolve `parents.version` -> `data.snapshot`
            // identically (and pick up the assertVersionKind guardrail).
            // valdres init is synchronous; read via the root txn.
            loadChangeSetBase(
                {
                    adapter: adapterOptions,
                    readEntity: (ref: any) =>
                        rootTxn.get(entityAtom(ref)) ?? null,
                } as any,
                changeSet,
                cache,
            )
        }

        for (const mutation of rootMutations) {
            const currentScopedMutation: any = scopedTxn.get(
                mutationAtom(mutation.ref),
            )
            if (rebuild || !currentScopedMutation.initialized) {
                const initTxn = prepareInitTransaction(
                    adapterOptions,
                    {
                        ...engineOpts,
                        txn: scopedTxn,
                        rootTxn,
                    },
                    mutation,
                    cache,
                )
                runSyncFunctionChain(
                    initTxn.request.operation.callback(initTxn as any),
                )
                scopedTxn.update(mutationAtom(mutation.ref), (curr: any) => {
                    return {
                        ...curr,
                        initialized: true,
                    }
                })
            }
        }
        for (const [ref, entity] of cache.entities as Map<Ref, any>) {
            if (entity === DELETED_IN_CHANGE_SET_SYMBOL) {
                // Hide the root's value in this scope.
                scopedTxn.delete(entityAtom(ref))
            } else {
                const indexd = validateAndIndexDocument(
                    adapterOptions.models[entity.entity],
                    entity,
                )
                scopedTxn.set(entityAtom(ref), indexd as any)
            }
        }
        if (rebuild) scopedTxn.set(scopeBuiltAtom, true)
    })
    return {
        ...engineOpts,
        scopedStore,
    }
}
