export const sortMutations = documents => {
    // Pick a single sort key per call:
    //   - If every mutation has `persistedAt` (typical on the server, or a
    //     fully-synced multi-client changeSet): sort by `persistedAt`, the
    //     only clock that's coherent across clients.
    //   - Otherwise (optimistic local apply with in-flight or offline
    //     mutations): sort by `timestamp`, the authoring client's causal
    //     clock. Mixing the two reorders dependent mutations on replay
    //     because `persistedAt` is wall-clock at persist receipt and can
    //     land after a later mutation's `timestamp`.
    const key = documents.every(d => d.persistedAt) ? "persistedAt" : "timestamp"
    return [...documents].sort((a, b) => {
        if (a[key] !== b[key]) {
            return a[key].localeCompare(b[key])
        }
        return a.ref.localeCompare(b.ref)
    })
}
