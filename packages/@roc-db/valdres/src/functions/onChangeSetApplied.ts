export const onChangeSetApplied = (txn, changeSetRef) => {
    if (txn.engineOpts.store.data?.scopes[changeSetRef]?.txnCache) {
        delete txn.engineOpts.store.data?.scopes[changeSetRef]
    }
}
