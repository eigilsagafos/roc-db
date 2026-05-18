export const sortMutations = documents => {
    return [...documents].sort((a, b) => {
        // Use persistedAt when present, fall back to timestamp. This preserves
        // causal order when a changeSet mixes persisted and not-yet-persisted
        // mutations — e.g. a user-made step that landed between a persisted
        // create and a persisted delete must still replay in the middle.
        const aKey = a.persistedAt ?? a.timestamp
        const bKey = b.persistedAt ?? b.timestamp
        if (aKey !== bKey) {
            return aKey.localeCompare(bKey)
        }
        return a.ref.localeCompare(b.ref)
    })
}
