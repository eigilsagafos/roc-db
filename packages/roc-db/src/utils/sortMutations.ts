export const sortMutations = documents => {
    return [...documents].sort((a, b) => {
        // Sort strictly by `timestamp` (the authoring client's causal clock).
        // `persistedAt` is server-side bookkeeping assigned at persist receipt,
        // which can land after a later mutation's `timestamp` when syncs are
        // delayed — mixing the two clocks reorders dependent mutations on
        // replay.
        if (a.timestamp !== b.timestamp) {
            return a.timestamp.localeCompare(b.timestamp)
        }
        return a.ref.localeCompare(b.ref)
    })
}
