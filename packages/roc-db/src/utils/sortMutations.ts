import { idFromRef } from "./idFromRef"

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
    // Decorate once so each id is parsed to a BigInt a single time rather than
    // on every comparison. A tied key — e.g. a whole batch sharing one
    // `persistedAt` — makes every comparison reach the id tiebreak, so without
    // this the parsing cost is O(n log n) instead of O(n).
    return documents
        .map(doc => ({ doc, sortKey: doc[key], id: BigInt(idFromRef(doc.ref)) }))
        .sort((a, b) => {
            if (a.sortKey !== b.sortKey) {
                return a.sortKey.localeCompare(b.sortKey)
            }
            // Deterministic tiebreak on the snowflake id so equal keys still
            // replay in creation order. The id's high bits are the timestamp,
            // so numeric id order == single-client creation order. Compare as
            // BigInt: ids exceed Number.MAX_SAFE_INTEGER and vary in decimal
            // length, so a lexical compare would misorder them.
            return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
        })
        .map(entry => entry.doc)
}
