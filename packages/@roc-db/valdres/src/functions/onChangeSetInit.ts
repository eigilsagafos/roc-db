import {
    sortMutations,
    validateAndIndexDocument,
    findOperation,
    parseRequestPayload,
    WriteTransaction,
    runSyncFunctionChain,
    generateTransactionCache,
    DELETED_IN_CHANGE_SET_SYMBOL,
} from "roc-db"

const prepareInitTransaction = (
    adapterOptions,
    engineOpts,
    mutation: Mutation,
    changeSet,
) => {
    const operation = findOperation(adapterOptions.operations, mutation)
    const request = {
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
        },
        payload,
        mutation,
        mutation.log,
        changeSet,
    )
}

const getRootMutations = (engineOpts, adapterOptions, changeSetRef) => {
    const res = engineOpts.store.txn(txn => {
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
    return sortMutations(res)
}

export const onChangeSetInit = (engineOpts, adapterOptions, changeSetRef) => {
    const { store, mutationAtom, entityAtom } = engineOpts
    const changeSet = store.get(entityAtom(changeSetRef))

    const scopedStore = store.scope(changeSetRef)
    const rootMutations = getRootMutations(
        engineOpts,
        adapterOptions,
        changeSetRef,
    )

    store.txn(rootTxn => {
        const versionRef = changeSet?.parents?.version
        const version = rootTxn.get(entityAtom(versionRef))
        rootTxn.scope(changeSetRef, scopedTxn => {
            const cache = generateTransactionCache()
            if (versionRef && !scopedTxn.data.versionRefLoaded) {
                if (version?.data?.snapshot) {
                    for (const doc of version.data.snapshot) {
                        cache.entities.set(doc.ref, doc)
                    }
                }
                scopedTxn.data.versionRefLoaded = versionRef
            }

            for (const mutation of rootMutations) {
                const currentScopedMutation = scopedTxn.get(
                    mutationAtom(mutation.ref),
                )
                if (!currentScopedMutation.initialized) {
                    const initTxn = prepareInitTransaction(
                        adapterOptions,
                        { ...engineOpts, txn: scopedTxn, rootTxn: rootTxn },
                        mutation,
                        cache,
                    )
                    runSyncFunctionChain(
                        initTxn.request.operation.callback(initTxn),
                    )
                    scopedTxn.set(mutationAtom(mutation.ref), curr => {
                        return {
                            ...curr,
                            initialized: true,
                        }
                    })
                }
            }
            for (const [ref, entity] of cache.entities) {
                if (entity === DELETED_IN_CHANGE_SET_SYMBOL) {
                    scopedTxn.reset(entityAtom(ref))
                } else {
                    const indexd = validateAndIndexDocument(
                        adapterOptions.models[entity.entity],
                        entity,
                    )
                    scopedTxn.set(entityAtom(ref), indexd)
                }
            }
        })
    })
    return {
        ...engineOpts,
        scopedStore,
    }
}
