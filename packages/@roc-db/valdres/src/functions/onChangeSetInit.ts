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
import type { Store, TransactionInterface } from "valdres"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

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
    const store = engineOpts.store as Store
    const res = store.txn(txn => {
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
    // valdres' Store.txn is typed to return void, but returns the callback's
    // value (Mutation[]) at runtime.
    return sortMutations(res as Mutation[])
}

export const onChangeSetInit: OnChangeSetInitFunction<ValdresEngine> = (
    engineOpts,
    adapterOptions,
    changeSetRef,
) => {
    const { mutationAtom, entityAtom } = engineOpts
    const store = engineOpts.store as Store
    const changeSet = store.get(entityAtom(changeSetRef))

    const scopedStore = store.scope(changeSetRef)
    const rootMutations = getRootMutations(
        engineOpts,
        adapterOptions,
        changeSetRef,
    )

    store.txn(rootTxn => {
        const versionRef = changeSet?.parents?.version
        rootTxn.scope(changeSetRef, scopedTxn => {
            const cache = generateTransactionCache()
            const scopedData = scopedTxn.data as any
            if (versionRef && !scopedData.versionRefLoaded) {
                // Seed the base snapshot via the shared helper so all three
                // seeding sites resolve `parents.version` -> `data.snapshot`
                // identically (and pick up the assertVersionKind guardrail).
                // valdres init is synchronous; read via the root txn.
                loadChangeSetBase(
                    {
                        adapter: adapterOptions,
                        readEntity: (ref: any) => rootTxn.get(entityAtom(ref)),
                    } as any,
                    changeSet,
                    cache,
                )
                scopedData.versionRefLoaded = versionRef
            }

            for (const mutation of rootMutations) {
                const currentScopedMutation: any = scopedTxn.get(
                    mutationAtom(mutation.ref),
                )
                if (!currentScopedMutation.initialized) {
                    const initTxn = prepareInitTransaction(
                        adapterOptions,
                        {
                            ...engineOpts,
                            txn: scopedTxn as unknown as TransactionInterface,
                            rootTxn: rootTxn as unknown as TransactionInterface,
                        },
                        mutation,
                        cache,
                    )
                    runSyncFunctionChain(
                        initTxn.request.operation.callback(initTxn as any),
                    )
                    scopedTxn.set(mutationAtom(mutation.ref), (curr: any) => {
                        return {
                            ...curr,
                            initialized: true,
                        }
                    })
                }
            }
            for (const [ref, entity] of cache.entities as Map<Ref, any>) {
                if (entity === DELETED_IN_CHANGE_SET_SYMBOL) {
                    scopedTxn.reset(entityAtom(ref) as any)
                } else {
                    const indexd = validateAndIndexDocument(
                        adapterOptions.models[entity.entity],
                        entity,
                    )
                    scopedTxn.set(entityAtom(ref), indexd as any)
                }
            }
        })
    })
    return {
        ...engineOpts,
        scopedStore,
    }
}
