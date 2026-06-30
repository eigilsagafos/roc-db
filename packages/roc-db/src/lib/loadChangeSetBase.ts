import type { Transaction } from "../types/Transaction"

// Seed `cache.entities` with a changeSet's base — the snapshot carried by its
// `parents.version` entity. This centralizes the version/snapshot convention so
// changeSet initialization (initializeChangeSet) and duplication
// (duplicateChangeSetMutations) resolve the base identically, instead of each
// hardcoding `parents.version` / `data.snapshot`.
//
// No-op when the changeSet has no version parent — the base is then the live
// store, resolved by readEntity falling through the cache.
//
// `changeSetDoc` must already be read (and verified) by the caller; pass the
// cache to seed (the transaction's own changeSet, or a scratch cache).
export const loadChangeSetBase = (
    txn: Transaction,
    changeSetDoc: any,
    cache: { entities: Map<any, any> },
) => {
    if (txn.adapter.async) {
        return loadChangeSetBaseAsync(txn, changeSetDoc, cache)
    }
    loadChangeSetBaseSync(txn, changeSetDoc, cache)
}

const seedSnapshot = (cache: { entities: Map<any, any> }, versionDoc: any) => {
    for (const doc of versionDoc?.data?.snapshot ?? []) {
        cache.entities.set(doc.ref, doc)
    }
}

const loadChangeSetBaseSync = (
    txn: Transaction,
    changeSetDoc: any,
    cache: { entities: Map<any, any> },
) => {
    const versionRef = changeSetDoc?.parents?.version
    if (!versionRef) return
    seedSnapshot(cache, (txn as any).readEntity(versionRef, false))
}

const loadChangeSetBaseAsync = async (
    txn: Transaction,
    changeSetDoc: any,
    cache: { entities: Map<any, any> },
) => {
    const versionRef = changeSetDoc?.parents?.version
    if (!versionRef) return
    seedSnapshot(cache, await (txn as any).readEntity(versionRef, false))
}
