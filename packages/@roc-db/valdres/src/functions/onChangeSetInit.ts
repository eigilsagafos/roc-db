export const onChangeSetInit = (engineOpts, changeSetRef) => {
    const scopedStore = engineOpts.store.scope(changeSetRef)
    return {
        ...engineOpts,
        scopedStore,
    }
}
